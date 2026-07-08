import { Role } from '@agentblog/shared'
import type { UserDTO } from '@agentblog/shared'

export function makeUser(overrides: Partial<UserDTO> = {}): UserDTO {
  return {
    id: 1,
    username: 'demo',
    role: Role.USER,
    credits: 0,
    avatarUrl: null,
    status: 'active',
    ...overrides,
  }
}
