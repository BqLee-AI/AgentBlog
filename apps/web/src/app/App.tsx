/**
 * 应用根组件。
 *
 * 本期（#2 骨架）只渲染首页占位，验证 Vite + React + Tailwind + shadcn 链路通。
 * 后续 issue 在此基础上叠加：
 *   - #4 QueryClientProvider / AuthProvider / Router
 *   - #7 ErrorBoundary / Toaster
 */
import { HomePage } from '@/pages/public/home.page'
import { ErrorCode, Role } from '@agentblog/shared'

export function App() {
  // 验证 shared 常量导入通（编译期 + 运行期）
  void ErrorCode
  void Role
  return <HomePage />
}
