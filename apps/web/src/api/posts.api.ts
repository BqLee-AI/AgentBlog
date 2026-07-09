import type {
  CreatePostDTO,
  ListPostsQuery,
  PaginatedDTO,
  PostWithAuthorDTO,
  UpdatePostDTO,
} from '@agentblog/shared'
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

  /** 后台：文章列表（含草稿，带 Bearer） */
  listAdmin(query: ListPostsQuery, signal?: AbortSignal) {
    return request<PaginatedDTO<PostWithAuthorDTO>>(
      '/api/posts',
      signal ? { method: 'GET', query, signal } : { method: 'GET', query },
    )
  },

  /** 后台：按 id 取文章（编辑用，含草稿） */
  getByIdForEdit(id: number, signal?: AbortSignal) {
    return request<PostWithAuthorDTO>(
      `/api/posts/by-id/${id}`,
      signal ? { signal } : undefined,
    )
  },

  /** 后台：创建文章 */
  create(dto: CreatePostDTO) {
    return request<PostWithAuthorDTO>('/api/posts', {
      method: 'POST',
      body: dto,
    })
  },

  /** 后台：更新文章 */
  update(id: number, dto: UpdatePostDTO) {
    return request<PostWithAuthorDTO>(`/api/posts/${id}`, {
      method: 'PATCH',
      body: dto,
    })
  },

  /** 后台：删除文章 */
  remove(id: number) {
    return request<{ deleted: true }>(`/api/posts/${id}`, {
      method: 'DELETE',
    })
  },
}
