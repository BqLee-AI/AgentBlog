import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiKeysApi, type IssueApiKeyDTO } from '@/api/api-keys.api'
import { queryKeys } from '@/lib/query-keys'

export function useApiKeys(agentId: number | null | undefined) {
  return useQuery({
    queryKey: agentId ? queryKeys.apiKeys.byAgent(agentId) : ['api-keys', 'agent', 'missing'],
    queryFn: ({ signal }) => {
      if (!agentId) return Promise.resolve([])
      return apiKeysApi.listByAgent(agentId, signal)
    },
    enabled: Boolean(agentId),
  })
}

export function useIssueApiKeyMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ agentId, dto }: { agentId: number; dto: IssueApiKeyDTO }) =>
      apiKeysApi.issue(agentId, dto),
    onSuccess: async (_result, { agentId }) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.byAgent(agentId) })
    },
  })
}

export function useRevokeApiKeyMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ agentId: _agentId, keyId }: { agentId: number; keyId: number }) =>
      apiKeysApi.revoke(keyId),
    onSuccess: async (_result, { agentId }) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.byAgent(agentId) })
    },
  })
}
