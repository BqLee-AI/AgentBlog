/**
 * 后台布局：顶栏 + 侧栏 + <Outlet/>。
 *
 * 本期（#5）只搭壳：
 *   - 顶栏：标题 + 当前用户名（来自 authStore）。credits 显示/退出按钮留 #6/#8。
 *   - 侧栏：按角色过滤导航项（tags/users 仅 admin+，见 02 §八）。
 *   - 内容区：<Outlet/> 渲染子路由。
 */
import { Link, Outlet } from 'react-router-dom'
import { ParticleField } from '@/components/effects/particle-field'
import { AdminSidebar } from '@/components/layout/admin-sidebar'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/use-auth'

export default function AdminLayout() {
  const { user } = useAuth()

  return (
    <div className="admin-stage relative min-h-screen overflow-hidden">
      <ParticleField />
      <div className="public-shell relative space-y-10 py-12 sm:py-16">
        <header className="space-y-8 border-b border-foreground/10 pb-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <span className="eyebrow">后台工作台</span>
              <h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
                AgentBlog Console
              </h1>
            </div>

            <div className="min-w-[260px] space-y-3 border-t border-foreground/10 pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <p className="meta-kicker">当前会话</p>
              <div>
                <p className="text-lg font-semibold tracking-tight text-foreground">
                  {user ? user.username : '未登录'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {user ? `${user.role} · ${user.credits} credits` : '请先登录'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm" className="rounded-md">
                  <Link to="/">回到前台</Link>
                </Button>
                <Button asChild size="sm" className="rounded-md">
                  <Link to="/chat">去对话</Link>
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
          <AdminSidebar />
          <main className="min-w-0 space-y-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
