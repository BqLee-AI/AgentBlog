/**
 * 认证模块 Zod schema（详见 docs/design/04 §五）
 *
 * 自助注册策略（doc 04 §一）：registerSchema 不含 role/credits，
 * 角色固定 user、初始 credits=0，提升角色是 admin+ 管理动作（任务 6）。
 *
 * 注意：本项目用 Zod 4，错误消息用 { error: '...' } 形式（非裸字符串）。
 */
export { loginSchema, registerSchema, type LoginDTO, type RegisterDTO } from '@agentblog/shared'
