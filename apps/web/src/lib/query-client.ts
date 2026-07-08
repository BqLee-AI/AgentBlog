/**
 * TanStack Query 全局配置。
 *
 * 设计要点（详见 docs/design/frontend/04 §五）：
 * - 4xx / 409 不重试（重试无用）；5xx / 网络错误重试 2 次
 * - mutation 不自动重试（避免重复创建等副作用）
 * - refetchOnWindowFocus 关闭（博客场景无需聚焦自动刷新）
 * - staleTime 30s（千级数据变化不频繁，减少重复请求）
 */
import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/http-error'

// 不重试的 HTTP 状态码（重试也不会变好）
const NO_RETRY_STATUS = new Set([400, 401, 402, 403, 404, 409, 422])

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && NO_RETRY_STATUS.has(error.status)) {
          return false
        }
        return failureCount < 2
      },
    },
    mutations: {
      retry: false,
    },
  },
})
