import { useQuery } from '@tanstack/react-query'
import { postsApi } from '@/api/posts.api'
import { queryKeys } from '@/lib/query-keys'
import type { ListPostsQueryDTO } from '@agentblog/shared'

export function usePostList(params: ListPostsQueryDTO) {
  return useQuery({
    queryKey: queryKeys.posts.list(params),
    queryFn: ({ signal }) => postsApi.listPublic(params, signal),
    placeholderData: (previousData) => previousData,
  })
}

export function usePost(slug: string) {
  return useQuery({
    queryKey: queryKeys.posts.detail(slug),
    queryFn: ({ signal }) => postsApi.getBySlug(slug, signal),
    enabled: !!slug,
  })
}
