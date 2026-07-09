import type { ListPostsQuery, PaginatedDTO, PostWithAuthorDTO } from '@agentblog/shared'
import { useQuery } from '@tanstack/react-query'
import { postsApi } from '@/api/posts.api'
import type { ApiError } from '@/lib/http-error'
import { queryKeys } from '@/lib/query-keys'

export function usePostList(params: ListPostsQuery) {
  return useQuery<PaginatedDTO<PostWithAuthorDTO>, ApiError>({
    queryKey: queryKeys.posts.list(params),
    queryFn: ({ signal }) => postsApi.listPublic(params, signal),
    placeholderData: (previousData) => previousData,
  })
}

export function usePost(slug: string | undefined) {
  return useQuery<PostWithAuthorDTO, ApiError>({
    queryKey: queryKeys.posts.detail(slug ?? ''),
    queryFn: ({ signal }) => postsApi.getBySlug(slug!, signal),
    enabled: !!slug,
  })
}
