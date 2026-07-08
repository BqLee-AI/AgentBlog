import { request } from '@/lib/request'
import type { ListPostsQueryDTO, PaginatedDTO, PublicPostDTO } from '@agentblog/shared'

export const postsApi = {
  listPublic(query: ListPostsQueryDTO, signal?: AbortSignal) {
    return request<PaginatedDTO<PublicPostDTO>>('/api/posts', {
      method: 'GET',
      query: { ...query },
      ...(signal ? { signal } : {}),
      public: true,
    })
  },

  getBySlug(slug: string, signal?: AbortSignal) {
    return request<PublicPostDTO>(`/api/posts/${encodeURIComponent(slug)}`, {
      method: 'GET',
      ...(signal ? { signal } : {}),
      public: true,
    })
  },
}
