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
import { AgentStatus, AuthorType, PostStatus, Role } from './constants'

type UrlConstructor = {
  new (url: string, base?: string): unknown
}

function isAssetUrl(value: string): boolean {
  if (value.startsWith('/')) return value.length > 1
  try {
    const URLCtor = (globalThis as typeof globalThis & { URL?: UrlConstructor }).URL
    if (!URLCtor) return false
    new URLCtor(value)
    return true
  } catch {
    return false
  }
}

function assetUrlSchema(error: string) {
  return z.string().refine(isAssetUrl, { error })
}

/** 分页查询参数（列表接口通用） */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
})
export type PaginationDTO = z.infer<typeof paginationSchema>

/** 角色枚举校验（与 shared/constants 的 Role 对齐） */
export const roleSchema = z.enum([Role.SUPER_ADMIN, Role.ADMIN, Role.USER])
export type RoleDTO = z.infer<typeof roleSchema>

/** 文章状态枚举校验 */
export const postStatusSchema = z.enum([PostStatus.DRAFT, PostStatus.PUBLISHED])

/** 文章列表查询（公开阅读端 + 后台列表共用） */
export const listPostsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  tag: z.string().optional(),
  status: z.enum([PostStatus.DRAFT, PostStatus.PUBLISHED]).optional(),
  authorType: z.enum([AuthorType.USER, AuthorType.AGENT]).optional(),
  authorId: z.coerce.number().int().optional(),
})
export type ListPostsQuery = z.infer<typeof listPostsQuerySchema>

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
  coverUrl: assetUrlSchema('封面地址格式不正确').optional(),
  status: z.enum([PostStatus.DRAFT, PostStatus.PUBLISHED]).default(PostStatus.DRAFT),
  tags: z.array(z.string().min(1).max(30)).max(10, { error: '最多 10 个标签' }).default([]),
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
  coverUrl: assetUrlSchema('封面地址格式不正确').optional(),
  status: z.enum([PostStatus.DRAFT, PostStatus.PUBLISHED]).optional(),
  tags: z.array(z.string().min(1).max(30)).max(10, { error: '最多 10 个标签' }).optional(),
})
export type UpdatePostDTO = z.infer<typeof updatePostSchema>

/**
 * 标签名字标准化（前后端共用）。
 * trim 每项 → 去空串 → 按小写去重 → 限 10 个。
 * 后端 post.service 在 findOrCreateMany 前调用；前端提交前也可调用做预处理。
 */
export function normalizeTagNames(raw: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of raw) {
    const name = typeof item === 'string' ? item.trim() : ''
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(name)
    if (out.length >= 10) break
  }
  return out
}

/** 创建 Agent */
export const createAgentSchema = z.object({
  name: z.string().min(1, { error: '名称不能为空' }).max(50),
  avatarUrl: assetUrlSchema('头像地址格式不正确').optional(),
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
  avatarUrl: assetUrlSchema('头像地址格式不正确').nullable().optional(),
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

/** 用户角色调整（仅 super_admin） */
export const updateUserRoleSchema = z.object({
  role: roleSchema,
})
export type UpdateUserRoleDTO = z.infer<typeof updateUserRoleSchema>
