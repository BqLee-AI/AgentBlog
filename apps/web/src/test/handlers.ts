import { ErrorCode } from '@agentblog/shared'
import { http, HttpResponse } from 'msw'

const defaultUser = {
  id: 1,
  username: 'admin',
  role: 'super_admin' as const,
  credits: 100000,
  avatarUrl: null,
  status: 'active' as const,
}

export const handlers = [
  http.get(/\/api\/posts$/, ({ request }) => {
    const url = new URL(request.url)

    return HttpResponse.json({
      ok: true,
      data: {
        items: [
          {
            id: 1,
            title: '测试文章',
            slug: 'test-post',
            summary: '用于 request 测试的文章',
            content: '# hello',
            coverUrl: null,
            status: 'published',
            authorType: 'user',
            authorId: 1,
            tags: [],
            createdAt: '2026-07-09T00:00:00.000Z',
            updatedAt: '2026-07-09T00:00:00.000Z',
            author: {
              type: 'user',
              id: 1,
              name: 'admin',
              avatarUrl: null,
            },
          },
        ],
        page: Number(url.searchParams.get('page') ?? 1),
        pageSize: Number(url.searchParams.get('pageSize') ?? 10),
        total: 1,
      },
    })
  }),

  http.get(/\/api\/auth\/me$/, ({ request }) => {
    const auth = request.headers.get('Authorization')
    if (auth === 'Bearer test-token') {
      return HttpResponse.json({
        ok: true,
        data: defaultUser,
      })
    }

    if (auth === 'Bearer server-error-token') {
      return HttpResponse.json(
        {
          ok: false,
          error: {
            code: ErrorCode.INTERNAL_ERROR,
            message: '服务器开小差了',
          },
        },
        { status: 500 },
      )
    }

    return HttpResponse.json(
      {
        ok: false,
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: '未提供认证信息',
        },
      },
      { status: 401 },
    )
  }),

  http.post(/\/api\/auth\/login$/, async ({ request }) => {
    const body = (await request.json()) as { username?: string; password?: string }

    if (body.username === 'field-error') {
      return HttpResponse.json(
        {
          ok: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: '参数校验失败',
            fields: {
              username: ['用户名已存在'],
            },
          },
        },
        { status: 400 },
      )
    }

    if (body.username === 'admin' && body.password === 'secret123') {
      return HttpResponse.json({
        ok: true,
        data: {
          token: 'test-token',
          user: defaultUser,
        },
      })
    }

    return HttpResponse.json(
      {
        ok: false,
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: '用户名或密码错误',
        },
      },
      { status: 401 },
    )
  }),

  http.post(/\/api\/agents\/\d+\/api-keys$/, async ({ request }) => {
    const body = (await request.json()) as { name?: string }

    return HttpResponse.json({
      ok: true,
      data: {
        id: 7,
        key: 'sk_live_test_xyz',
        keyPrefix: 'sk_live_test_xyz',
        name: body.name ?? null,
      },
    })
  }),
]
