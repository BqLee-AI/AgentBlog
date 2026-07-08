import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { env } from '@/config/env'
import { ErrorCode, PAGINATION, PostStatus, Role } from '@agentblog/shared'

const sharedContractChecks = [
  `Role: ${Role.ADMIN}`,
  `PostStatus: ${PostStatus.DRAFT}`,
  `Default page size: ${PAGINATION.DEFAULT_PAGE_SIZE}`,
  `ErrorCode: ${ErrorCode.UNAUTHORIZED}`,
]

export function App() {
  const [healthResult, setHealthResult] = useState('尚未请求')

  async function checkHealth() {
    setHealthResult('请求中...')

    try {
      const response = await fetch(`${env.apiBaseUrl}/api/health`)
      const payload = (await response.json()) as unknown
      setHealthResult(JSON.stringify(payload))
    } catch (error) {
      setHealthResult(error instanceof Error ? error.message : '请求失败')
    }
  }

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <section className="mx-auto max-w-4xl rounded-xl border bg-card p-8 text-card-foreground shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">AgentBlog Web</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">前端工程基线已就绪</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Vite、React、TypeScript、Tailwind、shadcn/ui、路径别名和 shared 契约已打通。
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" onClick={checkHealth}>
            检查 /api/health proxy
          </Button>
          <Button type="button" variant="secondary">
            shadcn Button
          </Button>
        </div>

        <div className="mt-6 rounded-lg border bg-muted p-4">
          <p className="text-sm font-medium">Health check</p>
          <pre className="mt-2 overflow-auto text-xs text-muted-foreground">{healthResult}</pre>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {sharedContractChecks.map((item) => (
            <div key={item} className="rounded-lg border p-3 text-sm">
              {item}
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
