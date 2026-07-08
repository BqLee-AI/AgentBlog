/**
 * @agentblog/shared —— 前后端共用的 Zod schema
 *
 * 仅放「前端表单 + 后端校验」都消费的公共 schema。
 * 仅后端内部用的 DTO（如含 tagIds 的 CreatePostDTO）留在 apps/api 模块内。
 * 分工原则见 docs/design/02 §四。
 *
 * 注意：本项目使用 Zod 4，错误消息用 { error: '...' } 而非裸字符串。
 */
import { z } from 'zod'
import { PostStatus, Role } from './constants'

/** 分页查询参数（列表接口通用） */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
})
export type PaginationDTO = z.infer<typeof paginationSchema>

/** 角色枚举校验（与 shared/constants 的 Role 对齐） */
export const roleSchema = z.enum([Role.SUPER_ADMIN, Role.ADMIN, Role.USER])

/** 文章状态枚举校验 */
export const postStatusSchema = z.enum([PostStatus.DRAFT, PostStatus.PUBLISHED])

/**
 * 登录请求（前后端共用，规则与后端 04 §五 一致）。
 * 前端表单（RHF + zodResolver）与后端 @hono/zod-validator 消费同一份。
 */
export const loginSchema = z.object({
  username: z.string().min(3, { error: '用户名至少 3 位' }).max(32, { error: '用户名最多 32 位' }),
  password: z.string().min(6, { error: '密码至少 6 位' }),
})
export type LoginDTO = z.infer<typeof loginSchema>
