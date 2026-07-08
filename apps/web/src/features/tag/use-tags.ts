import { useQuery } from '@tanstack/react-query'
import { tagsApi } from '@/api/tags.api'
import { queryKeys } from '@/lib/query-keys'

export function useTags() {
  return useQuery({
    queryKey: queryKeys.tags.all,
    queryFn: ({ signal }) => tagsApi.list(signal),
  })
}
