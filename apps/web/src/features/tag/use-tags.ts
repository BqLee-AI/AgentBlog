import type { CreateTagDTO, TagDTO } from '@agentblog/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { tagsApi } from '@/api/tags.api'
import type { ApiError } from '@/lib/http-error'
import { queryKeys } from '@/lib/query-keys'

export function useTags() {
  return useQuery({
    queryKey: queryKeys.tags.all,
    queryFn: ({ signal }) => tagsApi.list(signal),
    staleTime: 5 * 60_000,
  })
}

export function useCreateTag() {
  const queryClient = useQueryClient()

  return useMutation<TagDTO, ApiError, CreateTagDTO>({
    mutationFn: (dto) => tagsApi.create(dto),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.tags.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.posts.all }),
      ])
    },
  })
}

export function useDeleteTag() {
  const queryClient = useQueryClient()

  return useMutation<{ deleted: true }, ApiError, number>({
    mutationFn: (id) => tagsApi.remove(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.tags.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.posts.all }),
      ])
    },
  })
}
