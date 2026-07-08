/**
 * 应用根组件。
 *
 * RootProviders（QueryClient/AuthProvider/401 handler/402 监听/Suspense）
 * 包裹 RouterProvider（路由树）。
 */
import { RouterProvider } from 'react-router-dom'
import { RootProviders } from '@/app/root-providers'
import { router } from '@/app/router'

export function App() {
  return (
    <RootProviders>
      <RouterProvider router={router} />
    </RootProviders>
  )
}
