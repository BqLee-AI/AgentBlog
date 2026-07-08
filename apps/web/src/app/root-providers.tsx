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
import { Suspense, lazy, type ReactNode, useEffect } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'
import { setUnauthorizedHandler, INSUFFICIENT_CREDITS_EVENT } from '@/lib/request'
import { AuthProvider } from '@/features/auth/use-auth'

// 动态 import DevTools，确保生产 build 不打入 devtools 代码（静态 import 即使被
// import.meta.env.DEV 条件渲染，仍可能残留在依赖图）。lazy 让 Vite 单独切 chunk，
// 生产构建因 import.meta.env.DEV === false 而 dead-code elimination 整段移除。
const ReactQueryDevtools = lazy(() =>
  import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools })),
)

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
        {import.meta.env.DEV && (
          <Suspense fallback={null}>
            <ReactQueryDevtools initialIsOpen={false} />
          </Suspense>
        )}
      </AuthProvider>
    </QueryClientProvider>
  )
}
