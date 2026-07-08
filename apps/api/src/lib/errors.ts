/**
 * HttpError —— 业务错误基类（详见 docs/design/12 §四）
 *
 * service/repository 抛出 HttpError，route 不 try/catch，
 * 统一由 app.onError（middlewares/error-handler.ts）转成 { ok:false, error:{...} }。
 *
 * 错误码引自 @agentblog/shared 的 ErrorCode（单一真相源，不重复定义）。
 */
import { ErrorCode } from '@agentblog/shared'

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, string[]>,
  ) {
    super(message)
    this.name = 'HttpError'
  }

  // ── 静态工厂（默认消息对齐 docs/design/12 §三 错误码表）──

  /** 400 BAD_REQUEST —— 请求参数错误 */
  static badRequest(message = '请求参数错误', details?: Record<string, string[]>): HttpError {
    return new HttpError(400, ErrorCode.BAD_REQUEST, message, details)
  }

  /** 401 UNAUTHORIZED —— 未登录 / token 失效 */
  static unauthorized(message = '未提供认证信息'): HttpError {
    return new HttpError(401, ErrorCode.UNAUTHORIZED, message)
  }

  /** 403 FORBIDDEN —— 无权限（RBAC 拒绝 / 账号禁用） */
  static forbidden(message = '无权执行此操作'): HttpError {
    return new HttpError(403, ErrorCode.FORBIDDEN, message)
  }

  /** 404 NOT_FOUND —— 资源不存在 */
  static notFound(message = '资源不存在'): HttpError {
    return new HttpError(404, ErrorCode.NOT_FOUND, message)
  }

  /** 402 INSUFFICIENT_CREDITS —— 余额不足（需求 §4.5 指定 402） */
  static payment(message = '额度不足'): HttpError {
    return new HttpError(402, ErrorCode.INSUFFICIENT_CREDITS, message)
  }

  /** 409 CONFLICT —— 唯一约束冲突（用户名已存在等） */
  static conflict(message = '资源冲突'): HttpError {
    return new HttpError(409, ErrorCode.CONFLICT, message)
  }

  /** 500 INTERNAL_ERROR —— 服务器内部错误 */
  static internal(message = '服务器内部错误'): HttpError {
    return new HttpError(500, ErrorCode.INTERNAL_ERROR, message)
  }
}
