/**
 * RequireAuth —— 登录守卫。
 *
 * 放行语义：只放行 status === 'authenticated' 的明确认证态。
 *   - loading / idle（AuthProvider 正在校验或未启动）：显示全屏 Spin
 *   - error（/auth/me 的网络错误或 5xx）：显示重试入口，不伪装成“未登录”
 *   - unauthenticated（无 token，或 401 已被 request 层清态）：跳 /login，记住来源
 *   - authenticated：渲染 children
 * 非 401 失败（网络/5xx）会进入 error，由当前守卫提供重试入口；
 * 只有 401 才会走 request 层的清态 + 跳登录逻辑。
 */
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/use-auth'
import { authStore } from '@/lib/auth-store'
import { Spin } from '@/components/feedback/spin'
import { ErrorState } from '@/components/feedback/error-state'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const location = useLocation()

  // 未明确认证的中间态（校验中/未启动）：等待，避免闪烁跳转
  if (status === 'loading' || status === 'idle') {
    return <Spin fullscreen tip="正在验证登录…" />
  }

  if (status === 'error') {
    return (
      <ErrorState
        className="min-h-screen"
        message="登录状态校验失败，请重试"
        onRetry={() => authStore.setState({ status: 'idle' })}
      />
    )
  }

  // 非已认证（unauthenticated）：跳登录
  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <>{children}</>
}
