/**
 * 全局错误兜底中间件（详见 docs/design/12 §六）
 *
 * 注册方式：app.onError(errorHandler) —— 最外层，不受 app.use 注册顺序影响。
 *
 * 三分支：
 *   1. ZodError → 400 VALIDATION_ERROR + fields（字段级错误）
 *   2. HttpError → 用 err.status，code/message 透传
 *   3. 未知错误 → 500 INTERNAL_ERROR（生产环境不泄露堆栈）
 *
 * 响应 shape 对齐 @agentblog/shared 的 ErrorResponse。
 */
import type { ErrorHandler } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { ZodError } from 'zod'
import { env } from '@/config/env'
import { ErrorCode } from '@agentblog/shared'
import { HttpError } from '@/lib/errors'

export const errorHandler: ErrorHandler = (err, c) => {
  // 1. Zod 校验错误（service 层手动 parse 抛出时）→ 400 VALIDATION_ERROR
  if (err instanceof ZodError) {
    // 把 issues 按 path 拍平成 { field: [messages] }，顶层错误归到 `_`
    const fields: Record<string, string[]> = {}
    for (const issue of err.issues) {
      const key = issue.path.length > 0 ? issue.path.join('.') : '_'
      ;(fields[key] ??= []).push(issue.message)
    }
    return c.json(
      {
        ok: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: '请求参数校验失败',
          fields,
        },
      },
      400,
    )
  }

  // 2. HttpError（service 主动抛出）→ 透传 status + code + message
  if (err instanceof HttpError) {
    const body: { ok: false; error: { code: string; message: string; fields?: Record<string, string[]> } } = {
      ok: false,
      error: { code: err.code, message: err.message },
    }
    if (err.details) body.error.fields = err.details as Record<string, string[]>
    return c.json(body, err.status as ContentfulStatusCode)
  }

  // 3. 未知错误 → 500 INTERNAL_ERROR（生产环境不泄露内部信息）
  console.error('💥 未处理错误:', err)
  return c.json(
    {
      ok: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: env.NODE_ENV === 'production' ? '服务器内部错误，请稍后重试' : err.message,
      },
    },
    500,
  )
}
