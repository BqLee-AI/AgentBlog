/**
 * 统一响应封装（详见 docs/design/12）
 *
 * 所有路由返回 ok(c, data)，错误由 errorHandler 中间件统一处理。
 */
import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { OkResponse } from '@agentblog/shared'

/** 成功响应：{ ok: true, data } */
export function ok<T>(c: Context, data: T, status: ContentfulStatusCode = 200) {
  return c.json({ ok: true, data } satisfies OkResponse<T>, status)
}
