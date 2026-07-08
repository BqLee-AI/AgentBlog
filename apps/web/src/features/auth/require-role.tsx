/**
 * RequireRole —— 角色守卫。
 *
 * 必须挂在 RequireAuth 之后（依赖 user 已加载）。
 * 角色不在白名单 → 跳 /forbidden。
 *
 * 角色枚举来自 @agentblog/shared 的 Role（与后端 user.role 取值一致）。
 */
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import type { Role } from '@agentblog/shared'
import { useAuth } from '@/features/auth/use-auth'

interface Props {
  /** 允许进入的角色白名单，如 ['admin', 'super_admin'] */
  roles: Role[]
  children: ReactNode
}

export function RequireRole({ roles, children }: Props) {
  const { user } = useAuth()

  // 防御性：RequireAuth 已挡未登录，此处若 user 仍空则跳登录（不应发生）
  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!roles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />
  }

  return <>{children}</>
}
