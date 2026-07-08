import { z } from 'zod'
import { listPostsQuerySchema as sharedListPostsQuerySchema } from '@agentblog/shared'

/**
 * 文章模块 schema。
 *
 * 当前 issue #8 仅实现公开阅读端列表/详情，因此只落地列表查询 schema。
 * create/update schema 由后续 issue（后台文章工作流）补齐。
 */
export const listPostsQuerySchema = sharedListPostsQuerySchema.extend({
  authorType: z.enum(['user', 'agent']).optional(),
  authorId: z.coerce.number().int().positive().optional(),
})

export type ListPostsQuery = z.infer<typeof listPostsQuerySchema>
