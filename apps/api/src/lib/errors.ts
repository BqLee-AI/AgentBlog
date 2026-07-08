/**
 * 统一业务错误（详见 docs/design/12）
 *
 * 路由 / service 抛 HttpError，后续由全局 errorHandler 统一转成
 * `{ ok:false, error:{ code, message, details? } }`。
 *
 * 当前 issue #8 先在公开 posts/tags 路由内局部兜底；错误类本身按长期约定定义。
 */
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { ErrorCode } from '@agentblog/shared'

export class HttpError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'HttpError'
  }

  static badRequest(message = '请求参数不合法', details?: Record<string, unknown>) {
    return new HttpError(400, ErrorCode.BAD_REQUEST, message, details)
  }

  static notFound(message = '资源不存在') {
    return new HttpError(404, ErrorCode.NOT_FOUND, message)
  }

  static internal(message = '服务器内部错误') {
    return new HttpError(500, ErrorCode.INTERNAL_ERROR, message)
  }
}
