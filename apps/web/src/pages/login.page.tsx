/**
 * 登录页（最小可用版本）。
 *
 * 本期（#5）用受控原生表单（RHF 表单体系在 #6 落地后再升级复用 loginSchema）。
 * 登录成功读 location.state.from 回跳；无 from 跳 /admin。
 *
 * 复用 #4：authApi.login（公开请求）+ useAuthStore.setAuth。
 */
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { authApi, loginSchema } from '@/api/auth.api'
import { useAuthStore } from '@/lib/auth-store'
import type { Location } from 'react-router-dom'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const token = useAuthStore((s) => s.token)
  const setAuth = useAuthStore((s) => s.setAuth)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // 已登录访问 /login → 直接进后台
  if (token) {
    const from = (location.state as { from?: Location } | null)?.from?.pathname ?? '/admin'
    return <Navigate to={from} replace />
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    // 前端先校验（复用 loginSchema，规则与后端一致）
    const parsed = loginSchema.safeParse({ username, password })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? '输入有误')
      return
    }

    setSubmitting(true)
    try {
      const result = await authApi.login(parsed.data)
      setAuth(result.token, result.user)
      const from = (location.state as { from?: Location } | null)?.from?.pathname ?? '/admin'
      navigate(from, { replace: true })
    } catch (err) {
      // err 是 ApiError，message 已是中文（后端 04 §十）
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="container mx-auto flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">登录 AgentBlog</h1>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium">
              用户名
            </label>
            <input
              id="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="3-32 位"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              密码
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="至少 6 位"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? '登录中…' : '登录'}
          </Button>
        </form>
      </div>
    </main>
  )
}
