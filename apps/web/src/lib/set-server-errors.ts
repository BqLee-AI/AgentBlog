/**
 * setServerErrors —— 把后端 VALIDATION_ERROR 的字段级错误回填到 RHF 表单。
 *
 * 触发场景：前端 zod 放过但后端挡（如 slug 冲突、用户名已存在、
 * 后端比前端更严格的规则）。详见 docs/design/frontend/05 §二、后端 12 §七。
 *
 * 多数错误（409 冲突、402 余额）是全局错误而非字段错误，走全局 toast（#08），
 * 不走这里。仅 ApiError.isValidation（VALIDATION_ERROR）且带 fields 时回填。
 *
 * fields 形如 { username: ['已存在'], password: [] }，字段名直接对应 RHF name。
 * 每个字段取第一条消息（RHF 单字段单错误展示）。
 */
import type { FieldValues, UseFormReturn } from 'react-hook-form'
import { ApiError } from '@/lib/http-error'

export function setServerErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  err: unknown,
): void {
  // 仅处理后端校验错误；其余错误（网络/5xx/409/402）交给调用方或全局处理
  if (!(err instanceof ApiError) || !err.isValidation || !err.fields) return

  for (const [field, msgs] of Object.entries(err.fields)) {
    if (Array.isArray(msgs) && msgs[0]) {
      // 字段名由后端给出，对应 RHF 的 name（如 "username"、"slug"）。
      // 无法静态保证 field 属于 T 的字段，故做一次窄化断言。
      form.setError(field as Parameters<typeof form.setError>[0], {
        message: msgs[0],
      })
    }
  }
}
