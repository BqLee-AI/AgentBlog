/**
 * 全局 Provider 组装。
 *
 * 本期（#4）挂载：
 *   - QueryClientProvider（TanStack Query）
 *   - AuthProvider（启动校验 token）
 *   - 401 handler 注册（request 触发 → 跳 /login，router 在 #5 落地后改 router.navigate）
 *   - 402 事件监听（console 占位，#7 接 sonner toast）
 *
 * 后续叠加（不在本期）：
 *   - #5 RouterProvider / BrowserRouter
 *   - #7 ErrorBoundary（最外层）/ Toaster
 */
import { type ReactNode, useEffect } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/lib/query-client'
import { setUnauthorizedHandler, INSUFFICIENT_CREDITS_EVENT } from '@/lib/request'
import { AuthProvider } from '@/features/auth/use-auth'

export function RootProviders({ children }: { children: ReactNode }) {
  // 401 跳转：router 在 #5 落地前用 location 兜底（避免 request 直接依赖 router）
  useEffect(() => {
    setUnauthorizedHandler(() => {
      const current = window.location.pathname
      if (current !== '/login') {
        // 记住来源，#5 登录页据此回跳
        window.location.replace(`/login?from=${encodeURIComponent(current)}`)
      }
    })
  }, [])

  // 402 事件：#7 接 sonner toast 后改为 toast.error('额度不足，请联系管理员充值')
  useEffect(() => {
    const handler = () => {
      // TODO(#7)：替换为 sonner toast
      console.warn('[额度不足] 请联系管理员充值')
    }
    window.addEventListener(INSUFFICIENT_CREDITS_EVENT, handler)
    return () => window.removeEventListener(INSUFFICIENT_CREDITS_EVENT, handler)
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </AuthProvider>
    </QueryClientProvider>
  )
}
