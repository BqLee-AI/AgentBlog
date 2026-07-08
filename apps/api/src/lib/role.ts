/**
 * 角色等级与判定工具（详见 docs/design/05 §2.2）
 *
 * 角色等级用于「高等级包含低等级权限」判定（atLeast）。
 * requireRole 用精确白名单（hasRole），不靠等级推断，更安全。
 *
 * role 字面量与 @agentblog/shared 的 Role 常量值一致，不重复定义枚举。
 */
import type { Role } from '@agentblog/shared'

/** 角色等级（数字越大权限越高），key 与 shared Role 值对齐 */
export const ROLE_LEVEL: Record<Role, number> = {
  user: 1,
  admin: 2,
  super_admin: 3,
}

/** 当前角色是否在白名单内（requireRole 内部用） */
export function hasRole(actual: string, required: Role[]): boolean {
  return required.includes(actual as Role)
}

/** 当前角色等级是否 >= 指定最低角色（高等级包含低等级） */
export function atLeast(actual: string, min: Role): boolean {
  return (ROLE_LEVEL[actual as Role] ?? 0) >= ROLE_LEVEL[min]
}
