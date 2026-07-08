/**
 * 全局顶栏（阅读端 + 登录 + 公开页用）。
 *
 * 后台有自己的 layout 顶栏（admin/layout.page），不挂这个。
 * 本期（#5）极简：Logo + 进入后台/对话入口。登录状态显示由 #6/#8 补。
 */
import { Link } from 'react-router-dom'

export function SiteHeader() {
  return (
    <header className="flex h-14 items-center border-b px-4">
      <Link to="/" className="font-semibold">
        AgentBlog
      </Link>
      <nav className="ml-auto flex items-center gap-4 text-sm">
        <Link to="/posts" className="text-muted-foreground hover:text-foreground">
          文章
        </Link>
        <Link to="/chat" className="text-muted-foreground hover:text-foreground">
          对话
        </Link>
        <Link to="/admin" className="text-muted-foreground hover:text-foreground">
          后台
        </Link>
      </nav>
    </header>
  )
}
