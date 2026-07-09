/**
 * 用户管理模块 Zod schema（详见 docs/design/05 §七/§八）
 *
 * 角色调整请求已上提到 @agentblog/shared，前后端共用同一份契约。
 * 仅 status 变更仍属后端管理接口细节，留在本模块内。
 *
 * 注意：本项目用 Zod 4，错误消息用 { error: '...' } 形式。
 */
import { z } from 'zod'
import {
  paginationSchema,
  updateUserRoleSchema,
  UserStatus,
} from '@agentblog/shared'

/** 列表查询参数（复用 shared 分页 schema） */
export const listUsersSchema = paginationSchema

/** 改角色请求 body（前后端共用） */
export const updateRoleSchema = updateUserRoleSchema
export type UpdateRoleDTO = z.infer<typeof updateRoleSchema>

/** 改状态请求 body（启用/禁用） */
export const updateStatusSchema = z.object({
  status: z.enum([UserStatus.ACTIVE, UserStatus.DISABLED]),
})
export type UpdateStatusDTO = z.infer<typeof updateStatusSchema>
