/**
 * 后台侧栏 —— 按角色过滤导航项。
 *
 * 与守卫呼应：tags/users 仅 admin+ 可见。
 * 📌 菜单隐藏 ≠ 权限安全：用户手敲 URL 仍会进路由，RequireRole 守卫是第二道防线，
 *    后端 RBAC 是最终防线（见 02 §八）。
 */
import { NavLink } from 'react-router-dom'
import type { Role } from '@agentblog/shared'
import { useAuth } from '@/features/auth/use-auth'
import { cn } from '@/lib/cn'

interface NavItem {
  to: string
  label: string
  /** 不填 = 所有登录用户可见；填了则角色需匹配 */
  roles?: Role[]
}

const NAV: NavItem[] = [
  { to: '/admin/posts', label: '文章' },
  { to: '/admin/agent', label: '我的 Agent' },
  { to: '/admin/agent/keys', label: 'API Key' },
  { to: '/admin/credits', label: '额度流水' },
  { to: '/admin/tags', label: '标签', roles: ['admin', 'super_admin'] },
  { to: '/admin/users', label: '用户管理', roles: ['admin', 'super_admin'] },
]

export function AdminSidebar() {
  const { user } = useAuth()
  const items = NAV.filter((i) => !i.roles || (user && i.roles.includes(user.role)))

  return (
    <nav className="w-48 shrink-0 border-r p-2">
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'block rounded-md px-3 py-2 text-sm',
                  isActive ? 'bg-secondary font-medium' : 'hover:bg-accent',
                )
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
