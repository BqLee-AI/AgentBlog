/**
 * 应用根组件。
 *
 * 本期（#4）用 RootProviders 包裹首页：QueryClientProvider / AuthProvider / 401 跳转 / 402 监听。
 * 后续 issue 叠加：
 *   - #5 RouterProvider（替换直接渲染 HomePage）
 *   - #7 ErrorBoundary（最外层）/ Toaster
 */
import { RootProviders } from '@/app/root-providers'
import { HomePage } from '@/pages/public/home.page'

export function App() {
  return (
    <RootProviders>
      <HomePage />
    </RootProviders>
  )
}
