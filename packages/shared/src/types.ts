/**
 * @agentblog/shared —— API 契约类型（响应 payload 形状）
 *
 * 这些类型描述对外暴露的数据形状，后端 service 返回值、前端消费端共用。
 * 后端内部实现（如 repository 返回的原始行、含 passwordHash 的完整实体）
 * 不放这里，留在 apps/api 的模块内。
 */
import type {
  AgentStatus,
  ApiKeyStatus,
  AuthorType,
  PostStatus,
  Role,
  UserStatus,
} from './constants'

/** 对外暴露的用户（不含 passwordHash） */
export interface UserDTO {
  id: number
  username: string
  role: Role
  credits: number
  avatarUrl: string | null
  status: UserStatus
}

/** 登录结果（JWT + 当前用户） */
export interface LoginResultDTO {
  token: string
  user: UserDTO
}

/** Agent（需求 §4.3） */
export interface AgentDTO {
  id: number
  userId: number
  name: string
  avatarUrl: string | null
  systemPrompt: string | null
  status: AgentStatus
}

/** API Key（需求 §4.4）—— Key 明文仅在签发时返回一次，不在此 DTO */
export interface ApiKeyDTO {
  id: number
  agentId: number
  name: string | null
  status: ApiKeyStatus
  /** Key 的前缀，用于展示识别（如 sk_live_abc...） */
  keyPrefix: string
  createdAt: string
}

/** 文章（需求 §4.2） */
export interface PostDTO {
  id: number
  title: string
  slug: string | null
  summary: string | null
  content: string
  coverUrl: string | null
  status: PostStatus
  authorType: AuthorType
  authorId: number
  tags: TagDTO[]
  createdAt: string
  updatedAt: string
}

/** 标签（需求 §4.2 文章-标签多对多） */
export interface TagDTO {
  id: number
  name: string
  slug: string
}

/** 作者归属信息（阅读页展示用，需求 §2.5） */
export interface AuthorInfoDTO {
  type: AuthorType
  id: number
  name: string
  avatarUrl: string | null
  /** 仅当 type=agent：Agent 主人的用户名（标注「Agent 及其主人」） */
  ownerUsername?: string
}

/**
 * 操作者形状（service 层资源归属校验复用，详见 docs/design/05 §四）。
 *
 * 跨模块契约形状（post/agent/credit/user 等 service 的 actor 入参），上提至 shared
 * 作单一真相源，避免各 service 扇入依赖某个具体模块的导出（review should-fix-2）。
 * 注意：这是内部接口契约，非对外响应 payload。
 */
export interface Actor {
  id: number
  role: Role
}

/** 统一响应：成功（需求 §5 机器可读，详见 docs/design/12） */
export interface OkResponse<T> {
  ok: true
  data: T
}

/** 统一响应：失败 */
export interface ErrorResponse {
  ok: false
  error: {
    code: string
    message: string
    /** 请求追踪 ID（来自 X-Request-Id header） */
    requestId?: string
    /** 字段级校验错误（Zod 校验失败时） */
    fields?: Record<string, string[]>
  }
}

export type ApiResponse<T> = OkResponse<T> | ErrorResponse

/** 分页响应 */
export interface PaginatedDTO<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
