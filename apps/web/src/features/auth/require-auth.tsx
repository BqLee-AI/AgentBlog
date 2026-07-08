/**
 * RequireAuth —— 登录守卫。
 *
 * 放行语义：只放行 status === 'authenticated' 的明确认证态。
 *   - loading / idle（AuthProvider 正在校验或未启动）：显示全屏 Spin
 *   - unauthenticated（无 token，或校验失败包括非 401）：跳 /login，记住来源
 *   - authenticated：渲染 children
 *
 * 注：me() 非 401 失败时（网络/5xx），AuthProvider 会置 unauthenticated 但保留 token
 * （见 #4 use-auth）。此时跳 /login 不丢 token（sessionStorage 仍在），用户重新访问
 * 受保护路由时 AuthProvider 会用保留的 token 再 me() 一次——瞬态故障恢复后无感进入。
 * 这样守卫只放行明确认证态，消除「token 存在但未明确认证」的中间态放行。
 */
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/use-auth'
import { Spin } from '@/components/feedback/spin'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const location = useLocation()

  // 未明确认证的中间态（校验中/未启动）：等待，避免闪烁跳转
  if (status === 'loading' || status === 'idle') {
    return <Spin fullscreen tip="正在验证登录…" />
  }

  // 非已认证（unauthenticated，含 me() 非 401 失败但保留 token 的情况）：跳登录
  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <>{children}</>
}
