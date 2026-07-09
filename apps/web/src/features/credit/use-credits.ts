import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PaginationDTO, RechargeDTO } from '@agentblog/shared'
import { authApi } from '@/api/auth.api'
import { creditsApi } from '@/api/credits.api'
import { authStore, useAuthStore } from '@/lib/auth-store'
import { queryKeys } from '@/lib/query-keys'

export function useMyCreditLogs(params: PaginationDTO) {
  return useQuery({
    queryKey: queryKeys.credits.myLogs(params),
    queryFn: ({ signal }) => creditsApi.myLogs(params, signal),
    placeholderData: (previousData) => previousData,
  })
}

export function useUserCreditLogs(userId: number, params: PaginationDTO) {
  return useQuery({
    queryKey: queryKeys.credits.logs(userId, params),
    queryFn: ({ signal }) => creditsApi.logsByUser(userId, params, signal),
    enabled: userId > 0,
    placeholderData: (previousData) => previousData,
  })
}

export function useRechargeCredits() {
  const queryClient = useQueryClient()
  const currentUserId = useAuthStore((state) => state.user?.id)

  return useMutation({
    mutationFn: (dto: RechargeDTO) => creditsApi.recharge(dto),
    onSuccess: async (_result, dto) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.credits.all }),
      ])

      if (currentUserId === dto.userId) {
        void authApi
          .me()
          .then((user) => {
            authStore.getState().setUser(user)
            queryClient.setQueryData(queryKeys.me, user)
          })
          .catch(() => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.me })
          })
      }
    },
  })
}
