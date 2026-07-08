import { ErrorCode } from '@agentblog/shared'

/**
 * 前端统一 API 错误。
 *
 * 当前 issue #8 只需要公开 GET 的最小能力：status/code/message/fields。
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string[]>,
  ) {
    super(message)
    this.name = 'ApiError'
  }

  get isNotFound() {
    return this.code === ErrorCode.NOT_FOUND
  }
}
