/**
 * 后台侧栏 —— 按角色过滤导航项。
 *
 * 与守卫呼应：users 仅 admin+ 可见。
 * 📌 菜单隐藏 ≠ 权限安全：用户手敲 URL 仍会进路由，RequireRole 守卫是第二道防线，
 *    后端 RBAC 是最终防线（见 02 §八）。
 */
import { NavLink } from 'react-router-dom'
import { Bot, BookOpenText, Coins, KeyRound, Users } from 'lucide-react'
import type { Role } from '@agentblog/shared'
import { useAuth } from '@/features/auth/use-auth'
import { cn } from '@/lib/cn'

interface NavItem {
  to: string
  label: string
  icon: typeof BookOpenText
  /** 不填 = 所有登录用户可见；填了则角色需匹配 */
  roles?: Role[]
}

const NAV: NavItem[] = [
  { to: '/admin/posts', label: '文章', icon: BookOpenText },
  { to: '/admin/agent', label: '我的 Agent', icon: Bot },
  { to: '/admin/agent/keys', label: 'API Key', icon: KeyRound },
  { to: '/admin/credits', label: '额度流水', icon: Coins },
  { to: '/admin/users', label: '用户管理', icon: Users, roles: ['admin', 'super_admin'] },
]

export function AdminSidebar() {
  const { user } = useAuth()
  const items = NAV.filter((i) => !i.roles || (user && i.roles.includes(user.role)))

  return (
    <aside className="w-full border-b border-foreground/10 pb-4 lg:sticky lg:top-6 lg:border-b-0 lg:pb-0">
      <div className="mb-5 space-y-2">
        <p className="meta-kicker">Workspace</p>
        <p className="text-lg font-semibold tracking-tight text-foreground">后台导航</p>
      </div>

      <nav>
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/admin/agent'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-transparent text-muted-foreground hover:border-foreground/10 hover:bg-secondary hover:text-foreground',
                  )
                }
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
