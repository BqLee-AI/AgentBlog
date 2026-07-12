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
 *   - 双 schema 形态：MCP 的 registerTool 要 zod raw shape（schema.shape），AI SDK 的 tool()
 *     要整个 ZodObject（schema 本体）。故每个工具同时导出 shape（MCP 用）和 schema（AI SDK 用），
 *     二者派生自同一 ZodObject，单一真相源。
 *   - 🔴 slug 不可变：update_post 的 inputSchema 无 slug 字段（源头拒绝），handler 也不构造外部 slug。
 *
 * 计费不在本文件做——MCP 由 mcp/server.ts 的 wrapTool 包装器；在线 Agent 由 runtime 的 onFinish。
 */
import { z } from 'zod'
import { tool as aiTool, jsonSchema } from 'ai'
import { db } from '@/db/client'
import { posts } from '@/db/schema'
import { env } from '@/config/env'
import { HttpError } from '@/lib/errors'
import { normalizeTagNames } from '@agentblog/shared'
import { storage } from '@/lib/storage'
import { generateSlug } from '@/lib/slug'
import { postService } from '@/modules/post/post.service'
import { postRepository, type PostRow, type PostTagRow } from '@/modules/post/post.repository'
import { tagRepository } from '@/modules/tag/tag.repository'
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
  tags: z.array(z.string().min(1).max(30)).max(10).default([]).describe('标签名列表，不存在自动创建'),
})

// 🔴 无 slug 字段——源头拒绝外部改 slug（红线，需求 §1.2/§5）
const updatePostSchema = z.object({
  id: z.number().int().positive().describe('文章 id'),
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  summary: z.string().optional(),
  status: z.enum(['draft', 'published']).optional(),
  coverUrl: z.string().url().optional(),
  tags: z.array(z.string().min(1).max(30)).max(10).optional().describe('传则全量覆盖标签（名字，不存在自动创建）'),
})

const deletePostSchema = z.object({
  id: z.number().int().positive().describe('文章 id'),
})

/**
 * 5 个文章工具。工厂接收 ctx，返回 { description, shape, schema, handler }。
 * - shape（raw shape）：MCP registerTool 用
 * - schema（ZodObject 本体）：AI SDK tool() 用（toAiSdkTools）
 * handler 抛 HttpError 表示业务失败（MCP 由 wrapTool 转 isError 且不计费；在线 Agent 由 LLM 调用）。
 */
export function postTools(ctx: ToolContext) {
  return {
    list_posts: {
      description: '按标签列出已发布文章（草稿不对外暴露）。',
      shape: listPostsSchema.shape,
      schema: listPostsSchema,
      handler: async (args: z.infer<typeof listPostsSchema>): Promise<{ items: PostWithTags[]; total: number }> => {
        // 🔴 MCP list_posts 永远只返回 published（强制 isPublicView=true），
        //    不暴露 status 过滤——否则 agent 能经 status=draft 窥探全库他人草稿（信息泄露）。
        //    agent 要管理自己的草稿用 get_post（by id，但草稿不可读）/ update / delete。
        const result = await postRepository.listWindow({
          offset: args.offset,
          limit: args.limit,
          tag: args.tag,
          status: 'published',
        })
        const items = await Promise.all(
          result.items.map(async (post) => ({ ...post, tags: await postRepository.getTags(post.id) })),
        )
        return { items, total: result.total }
      },
    },

    get_post: {
      description: '按 slug 或 id 读取文章详情（至少传一个）。仅返回已发布文章。',
      shape: getPostSchema.shape,
      schema: getPostSchema,
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
      schema: createPostSchema,
      handler: async (args: z.infer<typeof createPostSchema>): Promise<PostRow> => {
        // 🔴 作者归属为该 Agent；published 时 postService 内部生成 slug（一次性，永久不可变）
        return postService.create(
          {
            title: args.title,
            content: args.content,
            summary: args.summary,
            coverUrl: args.coverUrl,
            status: args.status,
            tags: args.tags,
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
      schema: updatePostSchema,
      handler: async (args: z.infer<typeof updatePostSchema>): Promise<PostWithTags> => {
        const post = await postRepository.findById(args.id)
        if (!post) throw HttpError.notFound('文章不存在')

        // 📌 agent 归属校验：postService.update 的 isOwner 只认 user 作者，agent 会被 403，
        //    故 tools 层自做 agent 归属校验，直连 repository.updateWithTags（不走 postService.update）。
        if (post.authorType !== 'agent' || post.authorId !== ctx.agentId) {
          throw HttpError.forbidden('无权修改该文章')
        }

        const { id, tags, ...rest } = args

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

        const tagIds = tags !== undefined
          ? (await tagRepository.findOrCreateMany(normalizeTagNames(tags))).map((t) => t.id)
          : undefined
        const updated = await db.transaction(() => postRepository.updateWithTags(id, data, tagIds))
        if (!updated) throw HttpError.notFound('文章不存在')
        return updated
      },
    },

    delete_post: {
      description: '删除文章。仅允许删除当前 Agent 自己的文章。',
      shape: deletePostSchema.shape,
      schema: deletePostSchema,
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

    upload_image: {
      description:
        '上传图片到博客系统并返回永久可访问的 URL（JPEG/PNG/WebP/GIF）。用户在对话中发送的图片会被客户端自动转成 base64 传入。返回的 url 可用于 create_post 的 coverUrl，或嵌入 Markdown 正文 ![描述](url)。',
      shape: z.object({
        base64: z.string().min(1).describe('图片 base64 编码（不含 data:xxx;base64, 前缀）'),
        mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']).describe('图片 MIME 类型'),
        purpose: z.enum(['cover', 'content', 'misc']).default('content').describe('cover=封面, content=正文, misc=其他'),
      }).shape,
      schema: z.object({
        base64: z.string().min(1).describe('图片 base64 编码（不含 data:xxx;base64, 前缀）'),
        mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']).describe('图片 MIME 类型'),
        purpose: z.enum(['cover', 'content', 'misc']).default('content').describe('cover=封面, content=正文, misc=其他'),
      }),
      handler: async (args: {
        base64: string
        mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
        purpose: 'cover' | 'content' | 'misc'
      }): Promise<{ url: string; key: string; size: number }> => {
        const extMap: Record<string, string> = {
          'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif',
        }
        const buf = Buffer.from(args.base64, 'base64')
        const maxBytes = env.UPLOAD_MAX_SIZE_MB * 1024 * 1024
        if (buf.length > maxBytes) throw HttpError.badRequest('图片不能超过 ' + env.UPLOAD_MAX_SIZE_MB + 'MB')
        const file = new File([buf], 'upload' + (extMap[args.mimeType] || '.png'), { type: args.mimeType })
        return storage.save(file, args.purpose)
      },
    },
  }
}

/**
 * 把 postTools(defs) 转成 AI SDK v5 的 tool 定义（供在线 Agent streamText 用，详见 docs/design/10 §4.1）。
 *
 * ⚠️ zod 版本兼容：本仓用 zod@4，AI SDK 内部依赖 zod@3 的 zod-to-json-schema 转换器，
 *    直接传 ZodObject 会生成 `type: null` 的 JSON Schema，被 OpenAI/DeepSeek 端点拒绝。
 *    解法：用 zod4 原生 z.toJSONSchema() 生成正确的 JSON Schema，再经 AI SDK 的 jsonSchema()
 *    包装（含运行时 validate 保留 refine 等校验语义），完全绕过 AI SDK 的 zod3 转换层。
 *
 * 🔴 v5 把 tool() 的 schema 参数名从 parameters 改为 inputSchema（语义不变）。
 * 🔴 与 MCP 复用同一份 postTools 工具定义（需求 §4.6）；本函数只做格式转换，不含业务逻辑。
 */

/** 把 zod4 的 ZodObject 转成 AI SDK 的 jsonSchema（保留运行时校验，含 refine）。 */
function toAiSchema<T>(zo: z.ZodType<T>) {
  // z.toJSONSchema 返回 JSON Schema Draft 2020-12，AI SDK jsonSchema() 期望 JSONSchema7 类型。
  // 运行时兼容（都是标准 JSON Schema），仅 TS 类型定义版本不同，故断言。
  return jsonSchema<T>(z.toJSONSchema(zo) as Parameters<typeof jsonSchema>[0], {
    validate: (val) => {
      const r = zo.safeParse(val)
      return r.success
        ? { success: true as const, value: r.data }
        : { success: false as const, error: new Error(r.error.message) }
    },
  })
}

export function toAiSdkTools(defs: ReturnType<typeof postTools>) {
  return {
    list_posts: aiTool({
      description: defs.list_posts.description,
      inputSchema: toAiSchema(defs.list_posts.schema),
      execute: defs.list_posts.handler,
    }),
    get_post: aiTool({
      description: defs.get_post.description,
      inputSchema: toAiSchema(defs.get_post.schema),
      execute: defs.get_post.handler,
    }),
    create_post: aiTool({
      description: defs.create_post.description,
      inputSchema: toAiSchema(defs.create_post.schema),
      execute: defs.create_post.handler,
    }),
    update_post: aiTool({
      description: defs.update_post.description,
      inputSchema: toAiSchema(defs.update_post.schema),
      execute: defs.update_post.handler,
    }),
    delete_post: aiTool({
      description: defs.delete_post.description,
      inputSchema: toAiSchema(defs.delete_post.schema),
      execute: defs.delete_post.handler,
    }),
    upload_image: aiTool({
      description: defs.upload_image.description,
      inputSchema: toAiSchema(defs.upload_image.schema),
      execute: defs.upload_image.handler,
    }),
  }
}
