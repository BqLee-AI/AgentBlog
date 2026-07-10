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
import type { Location, To } from 'react-router-dom'

import { LoginForm } from '@/features/auth/login-form'
import { authApi } from '@/api/auth.api'
import type { LoginDTO } from '@agentblog/shared'
import { useAuthStore } from '@/lib/auth-store'
import { Spin } from '@/components/feedback/spin'

type RedirectSource = Pick<Location, 'pathname' | 'search' | 'hash' | 'state'>

function getRedirectTarget(locationState: unknown): { to: To; state?: unknown } {
  const from = (locationState as { from?: RedirectSource } | null)?.from

  if (!from?.pathname || from.pathname === '/login') {
    return { to: '/admin' }
  }

  return {
    to: {
      pathname: from.pathname,
      search: from.search ?? '',
      hash: from.hash ?? '',
    },
    state: from.state,
  }
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const token = useAuthStore((s) => s.token)
  const status = useAuthStore((s) => s.status)
  const setAuth = useAuthStore((s) => s.setAuth)

  // 顶部全局错误（非字段级）：401 凭证错、网络错误等
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const redirectTarget = getRedirectTarget(location.state)

  // 已明确认证访问 /login → 直接回跳；仅有 token 但仍在校验时先等待，避免 /login 回跳循环
  if (status === 'authenticated') {
    return <Navigate to={redirectTarget.to} state={redirectTarget.state} replace />
  }

  if (token && (status === 'idle' || status === 'loading')) {
    return <Spin fullscreen tip="正在验证登录…" />
  }

  const onSubmit = async (values: LoginDTO) => {
    setGlobalError(null)
    setSubmitting(true)
    try {
      const result = await authApi.login(values)
      setAuth(result.token, result.user)
      navigate(redirectTarget.to, { replace: true, state: redirectTarget.state })
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
    <section className="public-shell flex min-h-[calc(100vh-5rem)] items-center justify-center py-16">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-3 text-center">
          <span className="eyebrow">Welcome Back</span>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">登录 AgentBlog</h1>
        </div>

        <div className="rounded-lg border border-foreground/10 bg-card p-6 sm:p-8">
          <LoginForm onSubmit={onSubmit} submitting={submitting} onError={onError} />
        </div>

        {globalError ? <p className="text-center text-sm text-destructive">{globalError}</p> : null}
      </div>
    </section>
  )
}
