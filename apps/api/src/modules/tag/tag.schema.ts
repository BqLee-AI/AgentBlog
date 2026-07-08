/**
 * 标签模块 schema（详见 docs/design/06 §九）
 *
 * 标签是辅助实体：admin 可建，发文时引用。slug 由 service 生成（稳定，便于 MCP 按标签检索）。
 * 本项目用 Zod 4，错误消息用 { error: '...' } 形式。
 */
import { z } from 'zod'

/** 创建标签（🔴 不含 slug——service 用 generateSlug(name) 生成） */
export const createTagSchema = z.object({
  name: z.string().min(1, { error: '标签名不能为空' }).max(50, { error: '标签名最多 50 字符' }),
})
export type CreateTagDTO = z.infer<typeof createTagSchema>
