/**
 * 认证模块 Zod schema（详见 docs/design/04 §五）
 *
 * 自助注册策略（doc 04 §一）：registerSchema 不含 role/credits，
 * 角色固定 user、初始 credits=0，提升角色是 admin+ 管理动作（任务 6）。
 *
 * 注意：本项目用 Zod 4，错误消息用 { error: '...' } 形式（非裸字符串）。
 */
import { z } from 'zod'

/** 登录请求 */
export const loginSchema = z.object({
  username: z.string().min(3).max(32),
  password: z.string().min(6, { error: '密码至少 6 位' }),
})
export type LoginDTO = z.infer<typeof loginSchema>

/**
 * 注册请求（自助注册）。
 * .strict() 拒绝多余字段（role/credits 等），满足 doc 05 §十「传 role=admin → 422」验收。
 */
export const registerSchema = z
  .object({
    username: z.string().min(3).max(32),
    password: z.string().min(6, { error: '密码至少 6 位' }),
  })
  .strict()
export type RegisterDTO = z.infer<typeof registerSchema>
