import { ErrorCode } from '@agentblog/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authStore } from '@/lib/auth-store'
import { ApiError } from '@/lib/http-error'
import { queryClient } from '@/lib/query-client'
import { INSUFFICIENT_CREDITS_EVENT, request, setUnauthorizedHandler } from '@/lib/request'
import { server } from '@/test/server'
import { http, HttpResponse } from 'msw'

const user = {
  id: 1,
  username: 'admin',
  role: 'super_admin' as const,
  credits: 100000,
  avatarUrl: null,
  status: 'active' as const,
}

describe('request', () => {
  beforeEach(() => {
    setUnauthorizedHandler(() => {})
  })

  it('解包 { ok:true, data }', async () => {
    const data = await request<{ items: Array<{ id: number }>; total: number }>('/api/posts', {
      public: true,
      query: { page: 1, pageSize: 10 },
    })

    expect(data.items).toHaveLength(1)
    expect(data.total).toBe(1)
  })

  it('有 token 时注入 Bearer', async () => {
    authStore.getState().setAuth('test-token', user)

    const data = await request<typeof user>('/api/auth/me')

    expect(data.username).toBe('admin')
  })

  it('401 会清登录态、清 query cache，并触发 unauthorized handler', async () => {
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)
    authStore.getState().setAuth('bad-token', user)
    queryClient.setQueryData(['temp'], { ok: true })

    await expect(request('/api/auth/me')).rejects.toBeInstanceOf(ApiError)

    expect(authStore.getState().token).toBeNull()
    expect(queryClient.getQueryData(['temp'])).toBeUndefined()
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it('402 会派发额度不足事件', async () => {
    server.use(
      http.post(/\/api\/chat$/, () =>
        HttpResponse.json(
          {
            ok: false,
            error: {
              code: ErrorCode.INSUFFICIENT_CREDITS,
              message: '额度不足',
            },
          },
          { status: 402 },
        )),
    )

    const listener = vi.fn()
    window.addEventListener(INSUFFICIENT_CREDITS_EVENT, listener)

    await expect(
      request('/api/chat', { method: 'POST', body: { messages: [] }, public: true }),
    ).rejects.toMatchObject({
      code: ErrorCode.INSUFFICIENT_CREDITS,
    })

    expect(listener).toHaveBeenCalledTimes(1)
    window.removeEventListener(INSUFFICIENT_CREDITS_EVENT, listener)
  })
})
