/**
 * 后台布局：顶栏 + 侧栏 + <Outlet/>。
 *
 * 本期（#5）只搭壳：
 *   - 顶栏：标题 + 当前用户名（来自 authStore）。credits 显示/退出按钮留 #6/#8。
 *   - 侧栏：按角色过滤导航项（tags/users 仅 admin+，见 02 §八）。
 *   - 内容区：<Outlet/> 渲染子路由。
 */
import { Link, Outlet } from 'react-router-dom'
import { AdminSidebar } from '@/components/layout/admin-sidebar'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/use-auth'

export default function AdminLayout() {
  const { user } = useAuth()

  return (
    <div className="admin-stage min-h-screen">
      <div className="page-shell flex flex-col gap-6">
        <header className="page-hero">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <span className="eyebrow">后台工作台</span>
              <div className="space-y-2">
                <h1 className="text-3xl font-black text-foreground sm:text-4xl">AgentBlog Console</h1>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                  统一处理文章、Agent、API Key 与额度协作。视觉层采用同一套 teal / gold / coral 主题，避免前后台割裂。
                </p>
              </div>
            </div>

            <div className="ui-panel-soft min-w-[280px] rounded-[1.75rem] px-5 py-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary/70">当前会话</p>
              <p className="mt-2 text-xl font-bold text-foreground">
                {user ? user.username : '未登录'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {user ? `${user.role} · ${user.credits} credits` : '请先登录'}
              </p>
              <div className="mt-4 flex gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to="/">回到前台</Link>
                </Button>
                <Button asChild size="sm">
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
