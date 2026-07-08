import { Hono } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { zValidator } from '@hono/zod-validator'
import { ErrorCode, type ErrorResponse } from '@agentblog/shared'
import { ok } from '@/lib/response'
import { HttpError } from '@/lib/errors'
import { listPostsQuerySchema } from '@/modules/post/post.schema'
import { postService } from '@/modules/post/post.service'

export const posts = new Hono()

function toErrorResponse(err: unknown): { status: ContentfulStatusCode; body: ErrorResponse } {
  if (err instanceof HttpError) {
    return {
      status: err.status,
      body: {
        ok: false,
        error: {
          code: err.code,
          message: err.message,
          ...(err.details ? { fields: err.details as Record<string, string[]> } : {}),
        },
      },
    }
  }

  console.error('💥 posts route error:', err)
  return {
    status: 500,
    body: {
      ok: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: '服务器内部错误，请稍后重试',
      },
    },
  }
}

posts.get('/', zValidator('query', listPostsQuerySchema), async (c) => {
  try {
    const query = c.req.valid('query')
    const result = await postService.listPublic({
      page: query.page,
      pageSize: query.pageSize,
      ...(query.status ? { status: query.status } : {}),
      ...(query.tag ? { tag: query.tag } : {}),
    })
    return ok(c, result)
  } catch (err) {
    const { status, body } = toErrorResponse(err)
    return c.json(body, status)
  }
})

posts.get('/:slug', async (c) => {
  try {
    const post = await postService.getPublishedBySlug(c.req.param('slug'))
    return ok(c, post)
  } catch (err) {
    const { status, body } = toErrorResponse(err)
    return c.json(body, status)
  }
})
