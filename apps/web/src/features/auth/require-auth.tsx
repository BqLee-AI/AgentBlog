/**
 * RequireAuth —— 登录守卫。
 *
 * - status === 'loading'（AuthProvider 正在校验 token）：显示全屏 Spin
 * - 无 token / unauthenticated：跳 /login，记住来源（state.from）
 * - 已认证：渲染 children
 *
 * 挂在所有需登录的路由前（/chat、/admin/*）。
 */
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/use-auth'
import { Spin } from '@/components/feedback/spin'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { token, status } = useAuth()
  const location = useLocation()

  // 启动校验期：显示全屏 loading（避免守卫在 status 未定时闪烁跳转）
  if (status === 'loading' || (token && status === 'idle')) {
    return <Spin fullscreen tip="正在验证登录…" />
  }

  // 未登录：跳登录页，记住来源供登录后回跳
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <>{children}</>
}
