import type { ListPostsQuery, PaginatedDTO, PostWithAuthorDTO } from '@agentblog/shared'
import { request } from '@/lib/request'

export const postsApi = {
  /** 公开：文章列表（阅读端） */
  listPublic(query: ListPostsQuery, signal?: AbortSignal) {
    return request<PaginatedDTO<PostWithAuthorDTO>>(
      '/api/posts',
      signal
        ? { method: 'GET', query, signal, public: true }
        : { method: 'GET', query, public: true },
    )
  },

  /** 公开：文章详情（按 slug） */
  getBySlug(slug: string, signal?: AbortSignal) {
    return request<PostWithAuthorDTO>(
      `/api/posts/${encodeURIComponent(slug)}`,
      signal ? { signal, public: true } : { public: true },
    )
  },
}
