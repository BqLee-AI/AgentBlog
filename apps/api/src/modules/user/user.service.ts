/**
 * 用户管理服务（详见 docs/design/05 §四/§七/§八）
 *
 * 编排用户管理业务 + 权限校验。actor 形状统一为 { id, role }，
 * 后续 #18/#19/#20 的资源归属校验复用此形状范式。
 *
 * 双层防线：
 *   - 路由层 requireRole（粗粒度角色挡）
 *   - service 层再校验（提权边界 + 自我保护，防路由配置错或内部调用绕过）
 */
import type { Role, UserStatus, UserDTO, PaginatedDTO } from '@agentblog/shared'
import type { PaginationDTO } from '@agentblog/shared'
import { HttpError } from '@/lib/errors'
import { userRepository, type UserRow } from './user.repository'

/** 从 repository 行映射成对外 UserDTO（与 auth 模块的 toUserDTO 一致，不含时间戳） */
function toUserDTO(user: UserRow): UserDTO {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    credits: user.credits,
    avatarUrl: user.avatarUrl,
    status: user.status,
  }
}

/** actor 形状（后续所有 service 的资源归属校验复用） */
export interface Actor {
  id: number
  role: Role
}

export const userService = {
  /** 用户列表（admin+，角色已在路由 requireRole 挡） */
  async list(opts: PaginationDTO, _actor: Actor): Promise<PaginatedDTO<UserDTO>> {
    const { items, total } = await userRepository.findMany(opts)
    return {
      items: items.map(toUserDTO),
      total,
      page: opts.page,
      pageSize: opts.pageSize,
    }
  },

  /**
   * 改角色（仅 super_admin）。
   * 双层防线：路由 requireRole(SUPER_ADMIN) + service 再校验 actor.role。
   */
  async updateRole(targetId: number, newRole: Role, actor: Actor): Promise<UserDTO> {
    // 🔴 自我保护：不能改自己的角色（防唯一超管降级锁死系统）
    if (targetId === actor.id) {
      throw HttpError.forbidden('不能修改自己的角色')
    }

    // 🔴 提权边界：service 是最后防线，防路由配置错或内部调用绕过
    if (actor.role !== 'super_admin') {
      throw HttpError.forbidden('仅超管可修改用户角色')
    }

    const user = await userRepository.findById(targetId)
    if (!user) {
      throw HttpError.notFound('用户不存在')
    }

    const updated = await userRepository.updateRole(targetId, newRole)
    if (!updated) {
      throw HttpError.notFound('用户不存在')
    }
    return toUserDTO(updated)
  },

  /**
   * 改状态（admin+）。
   * 自我保护：不能禁用自己。
   */
  async updateStatus(targetId: number, status: UserStatus, actor: Actor): Promise<UserDTO> {
    // 🔴 自我保护：不能禁用自己
    if (targetId === actor.id && status === 'disabled') {
      throw HttpError.forbidden('不能禁用自己')
    }

    const user = await userRepository.findById(targetId)
    if (!user) {
      throw HttpError.notFound('用户不存在')
    }

    const updated = await userRepository.updateStatus(targetId, status)
    if (!updated) {
      throw HttpError.notFound('用户不存在')
    }
    return toUserDTO(updated)
  },
}
