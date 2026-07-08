import { Hono } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { ErrorCode, type ErrorResponse } from '@agentblog/shared'
import { ok } from '@/lib/response'
import { HttpError } from '@/lib/errors'
import { tagService } from '@/modules/tag/tag.service'

export const tags = new Hono()

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

  console.error('💥 tags route error:', err)
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

tags.get('/', async (c) => {
  try {
    const result = await tagService.list()
    return ok(c, result)
  } catch (err) {
    const { status, body } = toErrorResponse(err)
    return c.json(body, status)
  }
})
