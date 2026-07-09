import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PaginationDTO, UpdateUserRoleDTO } from '@agentblog/shared'
import { usersApi } from '@/api/users.api'
import { queryKeys } from '@/lib/query-keys'

interface UpdateUserRoleInput {
  userId: number
  dto: UpdateUserRoleDTO
}

export function useUsers(params: PaginationDTO) {
  return useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: ({ signal }) => usersApi.list(params, signal),
    placeholderData: (previousData) => previousData,
  })
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, dto }: UpdateUserRoleInput) => usersApi.updateRole(userId, dto),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
    },
  })
}
