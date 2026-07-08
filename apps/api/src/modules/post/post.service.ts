import { PAGINATION, type ListPostsQueryDTO } from '@agentblog/shared'
import { HttpError } from '@/lib/errors'
import { postRepository } from './post.repository'

function normalizeListQuery(query: ListPostsQueryDTO): {
  page: number
  pageSize: number
  status: 'published'
  tag?: string
} {
  return {
    page: query.page ?? PAGINATION.DEFAULT_PAGE,
    pageSize: query.pageSize ?? PAGINATION.DEFAULT_PAGE_SIZE,
    ...(query.tag ? { tag: query.tag } : {}),
    status: 'published' as const,
  }
}

export const postService = {
  async listPublic(query: ListPostsQueryDTO) {
    return postRepository.listPublic(normalizeListQuery(query))
  },

  async getPublishedBySlug(slug: string) {
    const post = await postRepository.findPublishedBySlug(slug)
    if (!post) {
      throw HttpError.notFound('文章不存在或未发布')
    }
    return post
  },
}
