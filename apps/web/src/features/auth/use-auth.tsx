/**
 * 鉴权 hook + AuthProvider。
 *
 * useAuth：组件内读 token/user/status。
 * AuthProvider：应用启动时若有 token 则调 /auth/me 校验，驱动 status 流转：
 *   idle（有 token）→ loading → authenticated / unauthenticated / error
 *
 * 守卫（#5）消费 status：loading 显示 Spin，unauthenticated 跳登录。
 */
import { useEffect, type ReactNode } from 'react'
import { useAuthStore, authStore } from '@/lib/auth-store'
import { authApi } from '@/api/auth.api'
import { ApiError } from '@/lib/http-error'
import { queryClient } from '@/lib/query-client'
import { queryKeys } from '@/lib/query-keys'

// ── hook：组件读鉴权状态 ──
export function useAuth() {
  return useAuthStore()
}

// ── Provider：启动校验 token ──
export function AuthProvider({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token)
  const status = useAuthStore((s) => s.status)

  useEffect(() => {
    // 无 token：直接置 unauthenticated（AuthProvider 仍渲染 children，守卫负责跳转）
    if (!token) {
      if (status !== 'unauthenticated') {
        authStore.setState({ status: 'unauthenticated' })
      }
      return
    }

    // 有 token 但不处于可启动校验态时，不重复打 /auth/me。
    // authenticated 代表已校验通过；loading 代表当前请求中；error 由守卫层提供重试入口。
    if (status !== 'idle') {
      return
    }

    // 有 token：idle → loading → 校验
    authStore.setState({ status: 'loading' })

    let cancelled = false
    authApi
      .me()
      .then((user) => {
        if (cancelled) return
        authStore.getState().setAuth(token, user)
        // 顺手写入 me 缓存，后台顶栏读当前用户可直接命中
        queryClient.setQueryData(queryKeys.me, user)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        // 401：request() 已处理（clear token + 清缓存 + 跳登录），status 已置 unauthenticated，无需再动
        if (err instanceof ApiError && err.isUnauthorized) return

        // 非 401（网络错误 / 5xx 等）：不丢 token，进入可重试错误态。
        // 避免把瞬态故障伪装成“未登录”，也避免 /login 与受保护页之间的循环跳转。
        authStore.setState({ status: 'error' })
      })

    return () => {
      cancelled = true
    }
    // token 变化会切换登录态；status=idle 时可由守卫层显式触发重试。
  }, [token, status])

  // loading 时仍渲染子树：守卫层会显示 Spin；避免整树延后挂载
  return <>{children}</>
}

// ── 登录 / 登出 便利 hook（供登录页 / 顶栏用）──
export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth)
  return {
    /** 登录成功后写入 token+user */
    loginSuccess: (token: string, user: Parameters<typeof setAuth>[1]) => setAuth(token, user),
  }
}

export function useLogout() {
  const clear = useAuthStore((s) => s.clear)
  return () => {
    clear()
    queryClient.clear()
  }
}
