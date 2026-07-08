/**
 * 文章服务层（详见 docs/design/02 §四 service 职责、06 §五）
 *
 * 业务编排：权限校验、slug 生成、作者归属、事务边界、标签关联。
 * 🔴 postService 不读 Hono Context（供 MCP / AI 流式三入口复用）：
 *   作者由调用方传入（HTTP user 路径传 c.var.user.id + 'user'；MCP agent 路径传 agent.id + 'agent'）。
 *
 * 🔴 slug 不可变红线三重防护：
 *   1. updatePostSchema 不含 slug 字段（Zod 层拒绝）——见 post.schema.ts
 *   2. 本 service.update 不从 dto 读 slug
 *   3. 已有 post.slug 永不覆盖；仅草稿→发布且 slug 为空时生成一次
 */
import { db } from '@/db/client'
import { posts } from '@/db/schema'
import { HttpError } from '@/lib/errors'
import { generateSlug } from '@/lib/slug'
import { postRepository } from './post.repository'
import type { CreatePostDTO, UpdatePostDTO, ListPostsQuery } from './post.schema'
import type { PostRow } from './post.repository'
import type { Role } from '@agentblog/shared'
// 复用 #17 定义的 Actor（user.service 标注「后续所有 service 的资源归属校验复用」），
// 不在 post 模块重复定义，保持 actor 形状单一真相源
import type { Actor } from '@/modules/user/user.service'

/** admin+ 可管理他人资源 */
function canManageOthers(role: Role): boolean {
  return role === 'admin' || role === 'super_admin'
}

export const postService = {
  /**
   * 创建文章。
   * - published → generateSlug(title)；draft → slug=null
   * - 事务：insert post + setTags 原子完成
   * - authorType 由调用方传入（HTTP='user'，MCP='agent'）
   */
  async create(dto: CreatePostDTO, authorId: number, authorType: 'user' | 'agent'): Promise<PostRow> {
    const slug = dto.status === 'published' ? generateSlug(dto.title) : null
    // 组装 insert data：nullable 列用 ?? null（exactOptionalPropertyTypes 下
    // $inferInsert.summary/coverUrl 为 string | null，不接受 undefined）
    const data: typeof posts.$inferInsert = {
      title: dto.title,
      summary: dto.summary ?? null,
      content: dto.content,
      coverUrl: dto.coverUrl ?? null,
      status: dto.status,
      authorId,
      authorType,
      slug,
    }
    return db.transaction(() => {
      return postRepository.createWithTags(data, dto.tagIds)
    })
  },

  /**
   * 按 slug 取已发布文章（阅读页 + MCP get_post 用）。
   * 🔴 仅返回 published；草稿/不存在 → 404。
   */
  async getBySlug(slug: string): Promise<PostRow & { tags: { id: number; name: string; slug: string }[] }> {
    const post = await postRepository.findBySlug(slug)
    if (!post || post.status !== 'published') {
      throw HttpError.notFound('文章不存在或未发布')
    }
    const tags = await postRepository.getTags(post.id)
    return { ...post, tags }
  },

  /**
   * 后台编辑用：按 id 取（含草稿），需登录。
   * 📌 这里只做读取；写权限（能否改）由 update/remove 的归属校验把关。
   */
  async getByIdForEdit(id: number): Promise<PostRow & { tags: { id: number; name: string; slug: string }[] }> {
    const post = await postRepository.findById(id)
    if (!post) throw HttpError.notFound('文章不存在')
    const tags = await postRepository.getTags(post.id)
    return { ...post, tags }
  },

  /**
   * 分页列表。
   * - isPublicView=true（阅读页）→ 强制 status='published'，忽略客户端传入的 status
   */
  async list(
    query: ListPostsQuery,
    isPublicView: boolean,
  ): Promise<{ items: (PostRow & { tags: { id: number; name: string; slug: string }[] })[]; total: number }> {
    if (isPublicView) {
      query.status = 'published'
    }
    const { items, total } = await postRepository.list(query)
    const withTags = await Promise.all(items.map(async (p) => ({ ...p, tags: await postRepository.getTags(p.id) })))
    return { items: withTags, total }
  },

  /**
   * 更新文章。
   * 🔴 资源归属：isOwner(authorType=user && authorId===actor.id) || admin+；否则 403。
   * 🔴 slug 不可变：不从 dto 读 slug；草稿→发布时仅当 post.slug 为空才生成一次，已有 slug 永不覆盖。
   */
  async update(postId: number, dto: UpdatePostDTO, actor: Actor): Promise<PostRow & { tags: { id: number; name: string; slug: string }[] }> {
    const post = await postRepository.findById(postId)
    if (!post) throw HttpError.notFound('文章不存在')

    // 资源归属校验
    const isOwner = post.authorType === 'user' && post.authorId === actor.id
    if (!isOwner && !canManageOthers(actor.role)) {
      throw HttpError.forbidden('无权修改他人文章')
    }

    // 🔴 slug 处理：草稿→发布且 slug 为空才生成一次；已有 slug 永不修改
    let slug = post.slug
    if (!slug && dto.status === 'published') {
      // 用 post.title（DB 里的原标题）生成，不用 dto.title——保证 slug 稳定
      slug = generateSlug(post.title)
    }

    // 解构出 tagIds（关联表单独处理），其余字段进 posts 表
    const { tagIds, ...rest } = dto

    // 组装 update data：只放入实际传入的字段（exactOptionalPropertyTypes 下，
    // Partial<$inferInsert> 的可选属性值不接受 undefined，必须条件性赋值）
    const data: Partial<typeof posts.$inferInsert> = { slug }
    if (rest.title !== undefined) data.title = rest.title
    if (rest.content !== undefined) data.content = rest.content
    if (rest.status !== undefined) data.status = rest.status
    // nullable 列：传了就落库（含空串），没传保持原值
    if (rest.summary !== undefined) data.summary = rest.summary ?? null
    if (rest.coverUrl !== undefined) data.coverUrl = rest.coverUrl ?? null

    return db.transaction(() => {
      return postRepository.updateWithTags(postId, data, tagIds)
    })
  },

  /**
   * 删除文章。
   * 资源归属：isOwner || 非 user 角色；user 改他人 → 403。
   * （post_tag 外键 cascade，关联自动清除）
   */
  async remove(postId: number, actor: Actor): Promise<void> {
    const post = await postRepository.findById(postId)
    if (!post) throw HttpError.notFound('文章不存在')

    const isOwner = post.authorType === 'user' && post.authorId === actor.id
    if (!isOwner && actor.role === 'user') {
      throw HttpError.forbidden('无权删除他人文章')
    }
    await postRepository.delete(postId)
  },
}
