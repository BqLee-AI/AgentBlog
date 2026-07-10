import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/cn'

const NAV_ITEMS = [
  { to: '/', label: '首页' },
  { to: '/posts', label: '文章' },
  { to: '/chat', label: '对话' },
  { to: '/admin', label: '后台' },
]

export function SiteHeader() {
  const location = useLocation()

  return (
    <header className="sticky top-0 z-30 border-b border-primary/10 bg-[rgba(239,248,247,0.82)] backdrop-blur-xl">
      <div className="mx-auto flex w-[min(1120px,calc(100%-2rem))] flex-wrap items-center gap-4 py-4">
        <Link
          to="/"
          className="ui-panel-soft flex items-center gap-3 rounded-full px-4 py-2.5 text-foreground"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#3cc4bd,#2ba8a2)] text-lg font-black text-white shadow-teal-glow">
            A
          </span>
          <span>
            <span className="block text-[0.68rem] font-bold uppercase tracking-[0.22em] text-primary/80">
              Agent Native Blog
            </span>
            <span className="block text-lg font-extrabold">AgentBlog</span>
          </span>
        </Link>

        <nav className="ml-auto flex flex-wrap items-center gap-2 rounded-full border border-primary/12 bg-white/70 p-2 shadow-card">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.to === '/'
                ? location.pathname === '/'
                : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)

            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-semibold',
                  isActive
                    ? 'bg-[linear-gradient(135deg,#ffe47a,#ffd23f)] text-[#234041] shadow-accent-glow'
                    : 'text-primary/80 hover:bg-[rgba(43,168,162,0.12)] hover:text-primary',
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
