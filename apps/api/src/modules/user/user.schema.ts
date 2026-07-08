/**
 * 用户管理模块 Zod schema（详见 docs/design/05 §七/§八）
 *
 * 仅后端管理接口消费（admin/super_admin 操作），不放 shared。
 * 前端用户管理页（#11）落地时再决定是否上提。
 *
 * 注意：本项目用 Zod 4，错误消息用 { error: '...' } 形式。
 */
import { z } from 'zod'
import { roleSchema, paginationSchema, UserStatus } from '@agentblog/shared'

/** 列表查询参数（复用 shared 分页 schema） */
export const listUsersSchema = paginationSchema

/** 改角色请求 body */
export const updateRoleSchema = z.object({
  role: roleSchema,
})
export type UpdateRoleDTO = z.infer<typeof updateRoleSchema>

/** 改状态请求 body（启用/禁用） */
export const updateStatusSchema = z.object({
  status: z.enum([UserStatus.ACTIVE, UserStatus.DISABLED]),
})
export type UpdateStatusDTO = z.infer<typeof updateStatusSchema>
