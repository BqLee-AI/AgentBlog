/**
 * 后台布局：顶栏 + 侧栏 + <Outlet/>。
 *
 * 本期（#5）只搭壳：
 *   - 顶栏：标题 + 当前用户名（来自 authStore）。credits 显示/退出按钮留 #6/#8。
 *   - 侧栏：按角色过滤导航项（tags/users 仅 admin+，见 02 §八）。
 *   - 内容区：<Outlet/> 渲染子路由。
 */
import { Outlet } from 'react-router-dom'
import { AdminSidebar } from '@/components/layout/admin-sidebar'
import { useAuth } from '@/features/auth/use-auth'

export default function AdminLayout() {
  const { user } = useAuth()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center justify-between border-b px-4">
        <span className="font-semibold">AgentBlog 管理后台</span>
        <span className="text-sm text-muted-foreground">
          {user ? `${user.username}（${user.role}） · ${user.credits} credits` : ''}
        </span>
      </header>

      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 overflow-x-hidden p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
