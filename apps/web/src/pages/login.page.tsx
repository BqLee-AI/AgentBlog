/**
 * 登录页。
 *
 * 用 LoginForm（RHF + zod + shared loginSchema 范式，见 #6）。
 * 登录成功读 location.state.from 回跳；无 from 跳 /admin。
 *
 * 错误处理（由 LoginForm 分流）：
 *   - VALIDATION_ERROR（字段级）→ LoginForm 内部 setServerErrors 回填 FormMessage
 *   - 其余（401 凭证错、5xx）→ onError → 顶部错误文案（全局 toast 在 #07 落地）
 */
import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import type { Location } from 'react-router-dom'

import { LoginForm } from '@/features/auth/login-form'
import { authApi } from '@/api/auth.api'
import type { LoginDTO } from '@agentblog/shared'
import { useAuthStore } from '@/lib/auth-store'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const token = useAuthStore((s) => s.token)
  const setAuth = useAuthStore((s) => s.setAuth)

  // 顶部全局错误（非字段级）：401 凭证错、网络错误等
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // 已登录访问 /login → 直接进后台
  if (token) {
    const from = (location.state as { from?: Location } | null)?.from?.pathname ?? '/admin'
    return <Navigate to={from} replace />
  }

  const onSubmit = async (values: LoginDTO) => {
    setGlobalError(null)
    setSubmitting(true)
    try {
      const result = await authApi.login(values)
      setAuth(result.token, result.user)
      const from =
        (location.state as { from?: Location } | null)?.from?.pathname ?? '/admin'
      navigate(from, { replace: true })
    } finally {
      setSubmitting(false)
    }
  }

  const onError = (err: unknown) => {
    // err 是 ApiError，message 已是中文（后端 04 §十）
    // 字段级错误已由 LoginForm 回填，此处只展示非字段级全局错误
    setGlobalError(err instanceof Error ? err.message : '登录失败')
  }

  return (
    <main className="container mx-auto flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">登录 AgentBlog</h1>
        </div>

        <LoginForm onSubmit={onSubmit} submitting={submitting} onError={onError} />

        {globalError && <p className="text-center text-sm text-destructive">{globalError}</p>}
      </div>
    </main>
  )
}
