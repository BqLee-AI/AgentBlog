/**
 * 首页。
 *
 * 本期（#5）展示站点入口导航。真实阅读端列表（最新文章）由 #8 实现。
 */
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <main className="container mx-auto flex min-h-screen flex-col items-center justify-center gap-6 py-20">
      <div className="space-y-2 text-center">
        <h1 className="text-4xl font-bold tracking-tight">AgentBlog</h1>
        <p className="text-muted-foreground">面向 Agent 的博客系统</p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" asChild>
          <Link to="/posts">浏览文章</Link>
        </Button>
        <Button asChild>
          <Link to="/admin">进入后台</Link>
        </Button>
      </div>
    </main>
  )
}
