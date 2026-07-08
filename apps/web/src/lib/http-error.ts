/**
 * 前端统一 API 错误。
 *
 * 包装后端 ErrorResponse.error 的字段（code/message/fields）+ HTTP status。
 * 业务层按 err.code 分支，不依赖 message 文案（message 是给人看的中文）。
 *
 * code 取值与 @agentblog/shared 的 ErrorCode 逐一对应（单一真相源）。
 */
import { ErrorCode } from '@agentblog/shared'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fields: Record<string, string[]> | undefined

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: Record<string, string[]>,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = fields
  }

  // ── 便利谓词，对应常用错误码（值来自 shared ErrorCode）──
  get isUnauthorized() {
    return this.code === ErrorCode.UNAUTHORIZED
  }
  get isForbidden() {
    return this.code === ErrorCode.FORBIDDEN
  }
  get isNotFound() {
    return this.code === ErrorCode.NOT_FOUND
  }
  get isInsufficientCredits() {
    return this.code === ErrorCode.INSUFFICIENT_CREDITS
  }
  get isValidation() {
    return this.code === ErrorCode.VALIDATION_ERROR
  }
  get isConflict() {
    return this.code === ErrorCode.CONFLICT
  }
}
