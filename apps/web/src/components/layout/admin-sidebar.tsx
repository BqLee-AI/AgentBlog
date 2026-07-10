/**
 * 后台侧栏 —— 按角色过滤导航项。
 *
 * 与守卫呼应：tags/users 仅 admin+ 可见。
 * 📌 菜单隐藏 ≠ 权限安全：用户手敲 URL 仍会进路由，RequireRole 守卫是第二道防线，
 *    后端 RBAC 是最终防线（见 02 §八）。
 */
import { NavLink } from 'react-router-dom'
import { Bot, BookOpenText, Coins, KeyRound, Tags, Users } from 'lucide-react'
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
  { to: '/admin/tags', label: '标签', icon: Tags, roles: ['admin', 'super_admin'] },
  { to: '/admin/users', label: '用户管理', icon: Users, roles: ['admin', 'super_admin'] },
]

export function AdminSidebar() {
  const { user } = useAuth()
  const items = NAV.filter((i) => !i.roles || (user && i.roles.includes(user.role)))

  return (
    <aside className="ui-panel w-full p-4 lg:sticky lg:top-6">
      <div className="mb-4 rounded-[1.5rem] border border-primary/10 bg-white/70 px-4 py-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary/70">Workspace</p>
        <p className="mt-1 text-lg font-bold text-foreground">后台导航</p>
        <p className="mt-1 text-sm text-muted-foreground">
          文章、Agent、额度与管理能力统一收口在这里。
        </p>
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
                    'flex items-center gap-3 rounded-[1.2rem] border px-3 py-3 text-sm font-semibold transition-all',
                    isActive
                      ? 'border-transparent bg-[linear-gradient(135deg,#ffe47a,#ffd23f)] text-[#234041] shadow-accent-glow'
                      : 'border-primary/10 bg-white/70 text-primary/80 hover:-translate-y-0.5 hover:border-primary/20 hover:bg-[rgba(232,246,245,0.92)] hover:text-primary',
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
