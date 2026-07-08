import { env } from '@/config/env'
import { ApiError } from '@/lib/http-error'
import type { ApiResponse } from '@agentblog/shared'

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  query?: Record<string, unknown>
  signal?: AbortSignal | undefined
  public?: boolean
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  const url = new URL(`${env.apiBaseUrl}${path}`, window.location.origin)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value))
      }
    }
  }
  return env.apiBaseUrl ? url.toString() : `${path}${url.search}`
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', query, signal } = options

  const response = await fetch(buildUrl(path, query), {
    method,
    ...(signal ? { signal } : {}),
    headers: {
      Accept: 'application/json',
    },
  })

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    throw new ApiError(response.status, 'INTERNAL_ERROR', `非预期的响应类型：${contentType}`)
  }

  const json: ApiResponse<T> = await response.json()
  if (!response.ok || !json.ok) {
    const error = json.ok === false
      ? json.error
      : { code: 'INTERNAL_ERROR', message: '服务器内部错误' }

    throw new ApiError(response.status, error.code, error.message, error.fields)
  }

  return json.data
}
