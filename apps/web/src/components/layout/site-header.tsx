import { Bot } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'

const navItems = [
  { to: '/', label: '首页', end: true },
  { to: '/posts', label: '文章', end: false },
  { to: '/chat', label: '对话', end: false },
]

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-foreground/10 bg-background/80 backdrop-blur">
      <div className="public-shell py-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <span className="text-base font-semibold tracking-tight text-foreground">AgentBlog</span>
          </Link>

          <nav className="ml-auto hidden items-center gap-6 md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'public-nav-link',
                    isActive && 'text-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <Button
            asChild
            variant="outline"
            className="ml-auto rounded-md px-4 md:ml-0"
          >
            <Link to="/admin">
              <Bot className="mr-2 h-4 w-4" />
              进入工作台
            </Link>
          </Button>
        </div>

        <nav className="flex items-center gap-5 overflow-x-auto pb-1 pt-3 md:hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'public-nav-link whitespace-nowrap',
                  isActive && 'text-foreground',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}
