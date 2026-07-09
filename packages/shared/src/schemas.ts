/**
 * @agentblog/shared —— 前后端共用的 Zod schema
 *
 * 仅放「前端表单 + 后端校验」都消费的公共 schema。
 * 仅后端内部用的查询 schema / 运行时局部 schema 留在 apps/api 模块内。
 * 分工原则见 docs/design/02 §四。
 *
 * 注意：本项目使用 Zod 4，错误消息用 { error: '...' } 而非裸字符串。
 */
import { z } from 'zod'
import { AgentStatus, PostStatus, Role } from './constants'

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

/** 自助注册（🔴 不接收 role / credits，角色固定 user） */
export const registerSchema = z
  .object({
    username: z.string().min(3, { error: '用户名至少 3 位' }).max(32, { error: '用户名最多 32 位' }),
    password: z.string().min(6, { error: '密码至少 6 位' }),
  })
  .strict()
export type RegisterDTO = z.infer<typeof registerSchema>

/** 创建文章（🔴 无 slug 字段；published 时由后端生成） */
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
 * 更新文章（🔴 无 slug 字段）
 *
 * 注意：不能直接用 createPostSchema.partial()，否则 default 语义会泄漏到更新场景。
 */
export const updatePostSchema = z.object({
  title: z.string().min(1, { error: '标题不能为空' }).optional(),
  summary: z.string().optional(),
  content: z.string().min(1, { error: '正文不能为空' }).optional(),
  coverUrl: z.string().url({ error: '封面地址格式不正确' }).optional(),
  status: z.enum([PostStatus.DRAFT, PostStatus.PUBLISHED]).optional(),
  tagIds: z.array(z.number().int().positive()).optional(),
})
export type UpdatePostDTO = z.infer<typeof updatePostSchema>

/** 创建标签（🔴 不含 slug——由后端生成） */
export const createTagSchema = z.object({
  name: z.string().min(1, { error: '标签名不能为空' }).max(50, { error: '标签名最多 50 字符' }),
})
export type CreateTagDTO = z.infer<typeof createTagSchema>

/** 创建 Agent */
export const createAgentSchema = z.object({
  name: z.string().min(1, { error: '名称不能为空' }).max(50),
  avatarUrl: z.string().url({ error: '头像地址格式不正确' }).optional(),
  systemPrompt: z.string().max(8000, { error: '系统提示词最多 8000 字符' }).optional(),
  status: z.enum([AgentStatus.ACTIVE, AgentStatus.DISABLED]).default(AgentStatus.ACTIVE),
})
export type CreateAgentDTO = z.infer<typeof createAgentSchema>

/**
 * 更新 Agent（所有字段可选）
 *
 * 注意：不能直接用 createAgentSchema.partial()，否则 status 的 default 会泄漏到更新场景，
 * 导致未传 status 的 PATCH 也被解析成 { status: 'active' }。
 */
export const updateAgentSchema = z.object({
  name: z.string().min(1, { error: '名称不能为空' }).max(50).optional(),
  avatarUrl: z.string().url({ error: '头像地址格式不正确' }).nullable().optional(),
  systemPrompt: z.string().max(8000, { error: '系统提示词最多 8000 字符' }).nullable().optional(),
  status: z.enum([AgentStatus.ACTIVE, AgentStatus.DISABLED]).optional(),
})
export type UpdateAgentDTO = z.infer<typeof updateAgentSchema>

/** 签发 API Key（名称可选，仅用于展示识别） */
export const issueApiKeySchema = z.object({
  name: z.string().max(50, { error: 'Key 名称最多 50 字符' }).optional(),
})
export type IssueApiKeyDTO = z.infer<typeof issueApiKeySchema>

/** Credits 充值（admin+） */
export const rechargeSchema = z.object({
  userId: z.number().int().positive(),
  amount: z.number().int().positive(),
  reason: z.string().default('手动充值'),
})
export type RechargeDTO = z.infer<typeof rechargeSchema>
