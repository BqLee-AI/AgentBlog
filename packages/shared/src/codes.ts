/**
 * @agentblog/shared —— 错误码（前后端共用，详见 docs/design/12）
 *
 * 后端 HttpError 抛出时填 code，前端按 code 做差异化提示（如 INSUFFICIENT_CREDITS → 跳充值）。
 */

export const ErrorCode = {
  // 4xx 客户端错误
  BAD_REQUEST: 'BAD_REQUEST', // 400
  UNAUTHORIZED: 'UNAUTHORIZED', // 401 未登录或 token 失效
  FORBIDDEN: 'FORBIDDEN', // 403 无权限（RBAC 拒绝）
  NOT_FOUND: 'NOT_FOUND', // 404
  CONFLICT: 'CONFLICT', // 409 唯一约束冲突（用户名已存在等）
  INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS', // 402 余额不足（需求 §4.5 指定 402）
  VALIDATION_FAILED: 'VALIDATION_FAILED', // 422 Zod 校验失败

  // 5xx 服务端错误
  INTERNAL_ERROR: 'INTERNAL_ERROR', // 500
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE', // 503 LLM 不可用等
} as const

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]

/** 错误码 → HTTP 状态码映射（后端 errorHandler 用，前端不依赖） */
export const ERROR_HTTP_STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  INSUFFICIENT_CREDITS: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION_FAILED: 422,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
}
