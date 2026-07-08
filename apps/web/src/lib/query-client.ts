/**
 * TanStack Query 全局配置。
 *
 * 设计要点（详见 docs/design/frontend/04 §五）：
 * - 4xx / 409 不重试（重试无用）；5xx / 网络错误重试 2 次
 * - mutation 不自动重试（避免重复创建等副作用）
 * - refetchOnWindowFocus 关闭（博客场景无需聚焦自动刷新）
 * - staleTime 30s（千级数据变化不频繁，减少重复请求）
 */
import { QueryClient, MutationCache } from '@tanstack/react-query'
import { ApiError } from '@/lib/http-error'
import { showErrorToast } from '@/lib/show-error-toast'

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
  // 全局 mutation 错误兜底：未被局部 catch 的 mutation 失败 → showErrorToast。
  // 业务层若需就地处理（如表单字段回填），局部定义 onError 即覆盖此默认行为。
  // 注意：局部 onError 存在时，cache.onError 仍会触发（v5 行为），故 showErrorToast
  // 内部对 401/402 做了抑制（它们已由 request 层/事件处理），避免重复打扰。
  mutationCache: new MutationCache({
    onError: (error) => showErrorToast(error),
  }),
})
