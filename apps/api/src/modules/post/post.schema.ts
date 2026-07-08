/**
 * 文章模块 schema（详见 docs/design/06 §二）
 *
 * 本项目用 Zod 4，错误消息用 { error: '...' } 形式（见 @agentblog/shared/schemas.ts 头注释）。
 *
 * 🔴 slug 不可变红线（需求 §1.2/§5）：
 *   createPostSchema / updatePostSchema 均**不含 slug 字段**。slug 由后端在发布时生成，
 *   一经发布永不修改。Zod 层从源头拒绝外部传入 slug，是三重防护的第一层。
 *
 * 分工：仅后端内部消费的 DTO 留模块内；跨前后端复用的枚举（PostStatus/AuthorType）从
 * @agentblog/shared 引入，不重复定义。
 */
import { z } from 'zod'
import { PostStatus, AuthorType } from '@agentblog/shared'

/** 创建文章（🔴 无 slug 字段；published 时由 service 生成） */
export const createPostSchema = z.object({
  title: z.string().min(1, { error: '标题不能为空' }),
  summary: z.string().optional(),
  content: z.string().min(1, { error: '正文不能为空' }),
  coverUrl: z.string().url({ error: '封面地址格式不正确' }).optional(),
  status: z.enum([PostStatus.DRAFT, PostStatus.PUBLISHED]).default(PostStatus.DRAFT),
  tagIds: z.array(z.number().int().positive()).default([]),
})
export type CreatePostDTO = z.infer<typeof createPostSchema>

/**
 * 更新文章（🔴 无 slug 字段——从源头拒绝外部修改 slug）
 *
 * 注意：用 createPostSchema.partial() 会让带 default 的 status/tagIds 变成 optional，
 * 但会保留 default 语义导致「不传 status 时默认 draft」的错误行为。
 * 因此这里**手写** updatePostSchema，每个字段显式 optional，不继承 default。
 */
export const updatePostSchema = z.object({
  title: z.string().min(1).optional(),
  summary: z.string().optional(),
  content: z.string().min(1).optional(),
  coverUrl: z.string().url().optional(),
  status: z.enum([PostStatus.DRAFT, PostStatus.PUBLISHED]).optional(),
  tagIds: z.array(z.number().int().positive()).optional(),
})
export type UpdatePostDTO = z.infer<typeof updatePostSchema>

/** 列表查询参数（GET /api/posts） */
export const listPostsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  tag: z.string().optional(), // tag slug
  status: z.enum([PostStatus.DRAFT, PostStatus.PUBLISHED]).optional(),
  authorType: z.enum([AuthorType.USER, AuthorType.AGENT]).optional(),
  authorId: z.coerce.number().int().optional(),
})
export type ListPostsQuery = z.infer<typeof listPostsQuerySchema>
