/**
 * zodCheck —— zValidator 的统一格式包装器（详见 docs/design/12 §七）
 *
 * @hono/zod-validator 校验失败时默认返回 { success, error }，不符合统一响应规范。
 * 本包装器把校验失败转成 { ok:false, error:{ code:VALIDATION_ERROR, message, fields } }，
 * 与 errorHandler 对 ZodError 的处理保持一致。
 */
import { zValidator } from '@hono/zod-validator'
import type { ZodSchema } from 'zod'
import type { ValidationTargets } from 'hono'
import { ErrorCode } from '@agentblog/shared'

/**
 * 用法同 zValidator，但校验失败时返回统一错误格式 { ok:false, error:{ code, message, fields } }。
 *   zodCheck('json', loginSchema)
 */
export function zodCheck<T extends ZodSchema, Target extends keyof ValidationTargets>(
  target: Target,
  schema: T,
) {
  return zValidator(target, schema, (result, c) => {
    if (!result.success) {
      // 把 issues 按 path 拍平成 { field: [messages] }，顶层错误归到 `_`
      const fields: Record<string, string[]> = {}
      for (const issue of result.error.issues) {
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
  })
}
