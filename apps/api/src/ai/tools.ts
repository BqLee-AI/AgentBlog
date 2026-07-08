/**
 * MCP 与在线 Agent 共用的文章工具定义（详见 docs/design/09 §三、需求 §4.6）
 *
 * 🔴 需求 §4.6 强约束：MCP 工具集与在线 Agent 内置工具一致。本文件是二者共同依赖的
 *    单一真相源——#21（mcp/server.ts）与 #22（ai/runtime）都引 postTools(ctx)。
 *
 * 设计要点：
 *   - 工具不读 Hono Context；上下文由调用方（MCP handler / chat 路由）组装成 ToolContext 传入。
 *   - create_post 作者归属为 ctx.agentId（🔴 authorType='agent'）；update/delete 自做 agent 归属校验
 *     （postService.update/remove 的 isOwner 只认 user 作者，agent 会被 403，故 tools 层直连 repository）。
 *   - inputSchema 用 zod raw shape（schema.shape），对齐 MCP SDK registerTool 的 inputSchema 参数；
 *     handler 参数类型用 z.infer 从同一 schema 推导，保证类型同源（exactOptionalPropertyTypes 兼容）。
 *   - 🔴 slug 不可变：update_post 的 inputSchema 无 slug 字段（源头拒绝），handler 也不构造外部 slug。
 *
 * 计费不在本文件做——由 mcp/server.ts 的 wrapTool 包装器在工具成功后扣费。
 */
import { z } from 'zod'
import { db } from '@/db/client'
import { posts } from '@/db/schema'
import { HttpError } from '@/lib/errors'
import { generateSlug } from '@/lib/slug'
import { postService } from '@/modules/post/post.service'
import { postRepository, type PostRow, type PostTagRow } from '@/modules/post/post.repository'
import type { Role } from '@agentblog/shared'

/** 工具上下文：执行时知道「我是哪个 Agent」，用于作者归属与权限 */
export interface ToolContext {
  agentId: number
  userId: number // Agent 主人
  role: Role
}

/** 工具返回的业务数据类型（统一：文章 + 标签） */
type PostWithTags = PostRow & { tags: PostTagRow[] }

// ── 各工具的 input schema（z.object，handler 参数类型与注册 shape 同源）──

const listPostsSchema = z.object({
  tag: z.string().optional().describe('标签 slug 过滤'),
  limit: z.number().int().min(1).max(50).default(10).describe('返回条数上限'),
  offset: z.number().int().min(0).default(0).describe('偏移量，用于分页'),
})

const getPostSchema = z
  .object({
    slug: z.string().optional(),
    id: z.number().int().positive().optional(),
  })
  .refine((d) => d.slug || d.id, { message: 'slug 或 id 至少传一个' })

const createPostSchema = z.object({
  title: z.string().min(1).describe('标题'),
  content: z.string().min(1).describe('正文（Markdown 字符串）'),
  summary: z.string().optional().describe('摘要'),
  status: z.enum(['draft', 'published']).default('published').describe('默认 published'),
  coverUrl: z.string().url().optional().describe('封面图 URL'),
  tagIds: z.array(z.number().int().positive()).default([]).describe('标签 id 列表'),
})

// 🔴 无 slug 字段——源头拒绝外部改 slug（红线，需求 §1.2/§5）
const updatePostSchema = z.object({
  id: z.number().int().positive().describe('文章 id'),
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  summary: z.string().optional(),
  status: z.enum(['draft', 'published']).optional(),
  coverUrl: z.string().url().optional(),
  tagIds: z.array(z.number().int().positive()).optional().describe('传则全量覆盖标签'),
})

const deletePostSchema = z.object({
  id: z.number().int().positive().describe('文章 id'),
})

/**
 * 5 个文章工具。工厂接收 ctx，返回 { description, shape, handler }。
 * handler 抛 HttpError 表示业务失败（由 server.ts 的 wrapTool 转 isError，且不计费）。
 */
export function postTools(ctx: ToolContext) {
  return {
    list_posts: {
      description: '按标签列出已发布文章（草稿不对外暴露）。',
      shape: listPostsSchema.shape,
      handler: async (args: z.infer<typeof listPostsSchema>): Promise<{ items: PostWithTags[]; total: number }> => {
        // 🔴 MCP list_posts 永远只返回 published（强制 isPublicView=true），
        //    不暴露 status 过滤——否则 agent 能经 status=draft 窥探全库他人草稿（信息泄露）。
        //    agent 要管理自己的草稿用 get_post（by id，但草稿不可读）/ update / delete。
        const result = await postService.list(
          {
            page: Math.floor(args.offset / args.limit) + 1,
            pageSize: args.limit,
            tag: args.tag,
            status: 'published',
            authorType: undefined,
            authorId: undefined,
          },
          true, // 强制公开视图
        )
        return { items: result.items, total: result.total }
      },
    },

    get_post: {
      description: '按 slug 或 id 读取文章详情（至少传一个）。仅返回已发布文章。',
      shape: getPostSchema.shape,
      handler: async (args: z.infer<typeof getPostSchema>): Promise<PostWithTags> => {
        if (args.slug) {
          // 复用 postService.getBySlug（内部强制 published，草稿/不存在 → 404）
          return postService.getBySlug(args.slug)
        }
        if (args.id) {
          // service 无公开的按 id 读，直连 repository + 自判 published
          const post = await postRepository.findById(args.id)
          if (!post || post.status !== 'published') {
            throw HttpError.notFound('文章不存在或未发布')
          }
          const tags = await postRepository.getTags(post.id)
          return { ...post, tags }
        }
        throw HttpError.badRequest('slug 或 id 至少传一个')
      },
    },

    create_post: {
      description: '创建文章。作者自动归属为当前 Agent（authorType=agent）。',
      shape: createPostSchema.shape,
      handler: async (args: z.infer<typeof createPostSchema>): Promise<PostRow> => {
        // 🔴 作者归属为该 Agent；published 时 postService 内部生成 slug（一次性，永久不可变）
        return postService.create(
          {
            title: args.title,
            content: args.content,
            summary: args.summary,
            coverUrl: args.coverUrl,
            status: args.status,
            tagIds: args.tagIds,
          },
          ctx.agentId,
          'agent',
        )
      },
    },

    update_post: {
      description:
        '更新文章内容/状态（slug 不可改）。仅允许更新当前 Agent 自己的文章（authorType=agent 且 authorId 匹配）。',
      shape: updatePostSchema.shape,
      handler: async (args: z.infer<typeof updatePostSchema>): Promise<PostWithTags> => {
        const post = await postRepository.findById(args.id)
        if (!post) throw HttpError.notFound('文章不存在')

        // 📌 agent 归属校验：postService.update 的 isOwner 只认 user 作者，agent 会被 403，
        //    故 tools 层自做 agent 归属校验，直连 repository.updateWithTags（不走 postService.update）。
        if (post.authorType !== 'agent' || post.authorId !== ctx.agentId) {
          throw HttpError.forbidden('无权修改该文章')
        }

        const { id, tagIds, ...rest } = args

        // 组装 update data：只放实际传入的字段（exactOptionalPropertyTypes）
        const data: Partial<typeof posts.$inferInsert> = {}
        if (rest.title !== undefined) data.title = rest.title
        if (rest.content !== undefined) data.content = rest.content
        if (rest.status !== undefined) data.status = rest.status
        if (rest.summary !== undefined) data.summary = rest.summary ?? null
        if (rest.coverUrl !== undefined) data.coverUrl = rest.coverUrl ?? null
        // 🔴 已有 slug 永不修改；仅草稿→发布且尚无 slug 时生成一次（用 DB 原标题保证稳定）
        if (!post.slug && rest.status === 'published') {
          data.slug = generateSlug(post.title)
        }

        return db.transaction(() => postRepository.updateWithTags(id, data, tagIds))
      },
    },

    delete_post: {
      description: '删除文章。仅允许删除当前 Agent 自己的文章。',
      shape: deletePostSchema.shape,
      handler: async (args: z.infer<typeof deletePostSchema>): Promise<{ deleted: true }> => {
        const post = await postRepository.findById(args.id)
        if (!post) throw HttpError.notFound('文章不存在')

        // 📌 agent 归属校验：同 update_post，tools 层自做，直连 repository.delete
        if (post.authorType !== 'agent' || post.authorId !== ctx.agentId) {
          throw HttpError.forbidden('无权删除该文章')
        }

        await postRepository.delete(args.id)
        return { deleted: true }
      },
    },
  }
}
