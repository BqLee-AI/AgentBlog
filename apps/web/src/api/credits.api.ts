import {
  paginationSchema,
  rechargeSchema,
  type CreditLogDTO,
  type PaginatedDTO,
  type PaginationDTO,
  type RechargeDTO,
} from '@agentblog/shared'
import { request } from '@/lib/request'

export { paginationSchema, rechargeSchema, type PaginationDTO, type RechargeDTO }

export const creditsApi = {
  myLogs(params: PaginationDTO, signal?: AbortSignal) {
    const query = paginationSchema.parse(params)
    return request<PaginatedDTO<CreditLogDTO>>(
      '/api/credits/me/logs',
      signal ? { query, signal } : { query },
    )
  },

  logsByUser(userId: number, params: PaginationDTO, signal?: AbortSignal) {
    const query = paginationSchema.parse(params)
    return request<PaginatedDTO<CreditLogDTO>>(
      `/api/credits/logs/${userId}`,
      signal ? { query, signal } : { query },
    )
  },

  recharge(dto: RechargeDTO) {
    return request<{ recharged: true }>('/api/credits/recharge', {
      method: 'POST',
      body: rechargeSchema.parse(dto),
    })
  },
}
