/**
 * @agentblog/shared —— 跨前后端共享的常量与枚举（单一真相源）
 *
 * 同一字段（如 PostStatus）只在 shared 定义一次，后端 Drizzle schema 与
 * 前端 UI 都从此引入，避免契约漂移。详见 docs/design/02 §一。
 */

/** 用户角色（需求 §2.3 RBAC） */
export const Role = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  USER: 'user',
} as const
export type Role = (typeof Role)[keyof typeof Role]

/** 文章状态（需求 §4.2） */
export const PostStatus = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
} as const
export type PostStatus = (typeof PostStatus)[keyof typeof PostStatus]

/** 作者类型（需求 §4.2 多态作者归属） */
export const AuthorType = {
  USER: 'user',
  AGENT: 'agent',
} as const
export type AuthorType = (typeof AuthorType)[keyof typeof AuthorType]

/** Agent 状态（需求 §4.3） */
export const AgentStatus = {
  ACTIVE: 'active',
  DISABLED: 'disabled',
} as const
export type AgentStatus = (typeof AgentStatus)[keyof typeof AgentStatus]

/** API Key 状态（需求 §4.4） */
export const ApiKeyStatus = {
  ACTIVE: 'active',
  REVOKED: 'revoked',
} as const
export type ApiKeyStatus = (typeof ApiKeyStatus)[keyof typeof ApiKeyStatus]

/** 用户账号状态 */
export const UserStatus = {
  ACTIVE: 'active',
  DISABLED: 'disabled',
} as const
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus]

/** Credits 流水类型（需求 §4.5） */
export const CreditLogType = {
  RECHARGE: 'recharge', // 充值（delta > 0）
  MCP_CALL: 'mcp_call', // MCP 按次计费（delta < 0）
  AGENT_TOKEN: 'agent_token', // 在线 Agent 按 token 计费（delta < 0）
} as const
export type CreditLogType = (typeof CreditLogType)[keyof typeof CreditLogType]

/** 列表分页默认值 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const
