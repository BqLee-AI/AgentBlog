/**
 * 统一 HTTP 请求入口。
 *
 * 📌 所有业务请求必须走 request()，禁止组件/hook 直接调 fetch（见 docs/design/frontend/03 §四）。
 *
 * 职责：
 *   - 注入 Bearer（公开请求 public:true 跳过）
 *   - 解包后端统一响应 { ok, data, error }：成功吐 data，失败抛 ApiError
 *   - 401 副作用：清 authStore + 清 queryClient 缓存 + 触发跳登录（通过可注入回调）
 *   - 402 副作用：派发 app:insufficient-credits 事件（不直接 toast，由 UI 层监听）
 *
 * 解耦边界：request 是纯逻辑层，不 import React/toast/router。
 *   - 401 的「跳登录」通过 setUnauthorizedHandler 由 app 层注入（router 在 #5 落地）。
 *   - 402 用 window CustomEvent，UI 层（RootProviders）监听。
 */
import type { ApiResponse } from '@agentblog/shared'
import { ApiError } from '@/lib/http-error'
import { authStore } from '@/lib/auth-store'
import { queryClient } from '@/lib/query-client'
import { env } from '@/config/env'

/** 401 时由 app 层注入的跳转回调（避免 request 直接依赖 router）。 */
type UnauthorizedHandler = () => void
let unauthorizedHandler: UnauthorizedHandler | null = null

export function setUnauthorizedHandler(fn: UnauthorizedHandler) {
  unauthorizedHandler = fn
}

/** 402 事件名：UI 层监听此事件弹「额度不足」toast。 */
export const INSUFFICIENT_CREDITS_EVENT = 'app:insufficient-credits'

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | boolean | undefined | null>
  signal?: AbortSignal
  /** 公开请求：不注入 Bearer（阅读端等） */
  public?: boolean
}

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = `${env.apiBaseUrl}${path}`
  if (!query) return url
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null) qs.append(k, String(v))
  }
  const s = qs.toString()
  return s ? `${url}?${s}` : url
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, signal, public: isPublic } = opts

  const headers: Record<string, string> = body ? { ...JSON_HEADERS } : {}
  if (!isPublic) {
    const token = authStore.getState().token
    if (token) headers.Authorization = `Bearer ${token}`
  }

  // exactOptionalPropertyTypes 下，不能传 body/signal: undefined，需条件构建 init
  const init: RequestInit = { method, headers }
  if (body !== undefined) init.body = JSON.stringify(body)
  if (signal) init.signal = signal

  const res = await fetch(buildUrl(path, query), init)

  // 非 JSON 响应兜底（如网关 502 的 HTML 错误页）
  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    throw new ApiError(res.status, 'INTERNAL_ERROR', `非预期的响应类型：${contentType}`)
  }

  const json: ApiResponse<T> = await res.json()

  // 业务失败（后端 ok:false，或 HTTP 非 2xx）
  if (!res.ok || !json.ok) {
    const errBody = !json.ok
      ? json.error
      : { code: 'INTERNAL_ERROR', message: '服务器内部错误' }
    const apiErr = new ApiError(res.status, errBody.code, errBody.message, errBody.fields)
    handleSideEffects(apiErr)
    throw apiErr
  }

  return json.data
}

/** 401 / 402 的统一副作用。 */
function handleSideEffects(err: ApiError) {
  if (err.isUnauthorized) {
    // 清登录态 + 清所有缓存（防切用户数据残留）+ 触发跳登录
    authStore.getState().clear()
    queryClient.clear()
    unauthorizedHandler?.()
    return
  }

  if (err.isInsufficientCredits) {
    // 派发事件，UI 层（RootProviders）监听后弹 toast；不在逻辑层直接弹
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(INSUFFICIENT_CREDITS_EVENT, { detail: err }))
    }
  }
}
