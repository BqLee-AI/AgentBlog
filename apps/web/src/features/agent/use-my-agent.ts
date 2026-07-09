import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type CreateAgentDTO, type UpdateAgentDTO } from '@agentblog/shared'
import { agentsApi } from '@/api/agents.api'
import { queryKeys } from '@/lib/query-keys'

export function useMyAgent() {
  return useQuery({
    queryKey: queryKeys.agent.mine,
    queryFn: ({ signal }) => agentsApi.me(signal),
  })
}

export function useCreateAgentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: CreateAgentDTO) => agentsApi.create(dto),
    onSuccess: async (agent) => {
      queryClient.setQueryData(queryKeys.agent.mine, agent)
      await queryClient.invalidateQueries({ queryKey: queryKeys.agent.mine })
    },
  })
}

export function useUpdateAgentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateAgentDTO }) =>
      agentsApi.update(id, dto),
    onSuccess: async (agent) => {
      queryClient.setQueryData(queryKeys.agent.mine, agent)
      await queryClient.invalidateQueries({ queryKey: queryKeys.agent.mine })
    },
  })
}

export function useDeleteAgentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => agentsApi.remove(id),
    onSuccess: async (_result, id) => {
      queryClient.setQueryData(queryKeys.agent.mine, null)
      queryClient.removeQueries({ queryKey: queryKeys.apiKeys.byAgent(id) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.agent.mine })
    },
  })
}
