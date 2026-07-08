/**
 * IfRole —— 按钮级/元素级权限组件。
 *
 * 与 require-role.tsx（路由级守卫，跳 /forbidden）区分：
 *   - require-role：整页/整路由的访问控制（admin 才能进 /admin/users）
 *   - IfRole：页面内单元素显隐（仅超管显示「危险操作」按钮）
 *
 * 角色不匹配 → 渲染 fallback（默认 null），不跳转。
 * 角色枚举来自 @agentblog/shared 的 Role（与后端一致）。
 */
import type { ReactNode } from 'react'
import type { Role } from '@agentblog/shared'
import { useAuth } from '@/features/auth/use-auth'

interface IfRoleProps {
  /** 允许看到 children 的角色白名单，如 ['super_admin'] */
  roles: Role[]
  children: ReactNode
  /** 角色不匹配时渲染（默认不渲染） */
  fallback?: ReactNode
}

export function IfRole({ roles, children, fallback = null }: IfRoleProps) {
  const { user } = useAuth()

  // 未登录或角色不在白名单 → 渲染 fallback
  // （未登录情况由 RequireAuth 在路由层挡掉，此处仅防御性处理）
  if (!user || !roles.includes(user.role)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
