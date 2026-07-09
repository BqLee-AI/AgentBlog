import type {
  CreatePostDTO,
  ListPostsQuery,
  PaginatedDTO,
  PostWithAuthorDTO,
  UpdatePostDTO,
} from '@agentblog/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { postsApi } from '@/api/posts.api'
import type { ApiError } from '@/lib/http-error'
import { queryKeys } from '@/lib/query-keys'

export function usePostList(params: ListPostsQuery) {
  return useQuery<PaginatedDTO<PostWithAuthorDTO>, ApiError>({
    queryKey: queryKeys.posts.list({ scope: 'public', ...params }),
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

export function usePostListAdmin(params: ListPostsQuery) {
  return useQuery<PaginatedDTO<PostWithAuthorDTO>, ApiError>({
    queryKey: queryKeys.posts.list({ scope: 'admin', ...params }),
    queryFn: ({ signal }) => postsApi.listAdmin(params, signal),
    placeholderData: (previousData) => previousData,
  })
}

export function usePostForEdit(id: number | undefined) {
  return useQuery<PostWithAuthorDTO, ApiError>({
    queryKey: queryKeys.posts.detailById(id ?? 0),
    queryFn: ({ signal }) => postsApi.getByIdForEdit(id!, signal),
    enabled: !!id,
  })
}

export function useCreatePost() {
  const queryClient = useQueryClient()

  return useMutation<PostWithAuthorDTO, ApiError, CreatePostDTO>({
    mutationFn: (dto) => postsApi.create(dto),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.posts.all })
    },
  })
}

export function useUpdatePost() {
  const queryClient = useQueryClient()

  return useMutation<PostWithAuthorDTO, ApiError, { id: number; dto: UpdatePostDTO }>({
    mutationFn: ({ id, dto }) => postsApi.update(id, dto),
    onSuccess: async (_post, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.posts.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.posts.detailById(variables.id) }),
      ])
    },
  })
}

export function useDeletePost() {
  const queryClient = useQueryClient()

  return useMutation<{ deleted: true }, ApiError, number>({
    mutationFn: (id) => postsApi.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.posts.all })
    },
  })
}
