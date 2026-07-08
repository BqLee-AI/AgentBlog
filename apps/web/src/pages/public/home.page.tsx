/**
 * 首页占位（#2 骨架阶段）。
 *
 * 仅用于验证前端基础链路通：Vite + React + Tailwind + shadcn Button + shared 导入。
 * 真实阅读端列表由 #8 实现。
 */
import { Button } from '@/components/ui/button'
import { ErrorCode, Role } from '@agentblog/shared'

export function HomePage() {
  return (
    <main className="container mx-auto flex min-h-screen flex-col items-center justify-center gap-6 py-20">
      <div className="space-y-2 text-center">
        <h1 className="text-4xl font-bold tracking-tight">AgentBlog</h1>
        <p className="text-muted-foreground">
          面向 Agent 的博客系统 · 前端骨架就绪
        </p>
      </div>

      <div className="flex gap-3">
        <Button>默认按钮</Button>
        <Button variant="secondary">次要</Button>
        <Button variant="outline">描边</Button>
      </div>

      <p className="text-xs text-muted-foreground">
        shared 契约导入验证：ErrorCode.UNAUTHORIZED = {ErrorCode.UNAUTHORIZED} · Role.ADMIN ={' '}
        {Role.ADMIN}
      </p>
    </main>
  )
}
