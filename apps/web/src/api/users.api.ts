import {
  paginationSchema,
  updateUserRoleSchema,
  type PaginatedDTO,
  type PaginationDTO,
  type UpdateUserRoleDTO,
  type UserDTO,
} from '@agentblog/shared'
import { request } from '@/lib/request'

export {
  paginationSchema,
  updateUserRoleSchema,
  type PaginationDTO,
  type UpdateUserRoleDTO,
}

export const usersApi = {
  list(params: PaginationDTO, signal?: AbortSignal) {
    const query = paginationSchema.parse(params)
    return request<PaginatedDTO<UserDTO>>(
      '/api/users',
      signal ? { query, signal } : { query },
    )
  },

  updateRole(userId: number, dto: UpdateUserRoleDTO) {
    return request<UserDTO>(`/api/users/${userId}/role`, {
      method: 'PATCH',
      body: updateUserRoleSchema.parse(dto),
    })
  },
}
