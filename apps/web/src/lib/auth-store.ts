/**
 * 鉴权状态：token + 当前用户 + 登录态。
 *
 * token 存 sessionStorage（非 localStorage）——降低 XSS 暴露面，关闭标签页即清。
 * 详见后端 docs/design/04 §四（Bearer Header、token 存储建议）。
 */
import { create } from 'zustand'
import type { UserDTO } from '@agentblog/shared'

const TOKEN_KEY = 'agentblog_token'
// 📌 sessionStorage：刷新不丢，关闭标签页即清（后端 04 §四建议，避免 localStorage）
const TOKEN_STORAGE = typeof window !== 'undefined' ? sessionStorage : null

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated'

interface AuthState {
  token: string | null
  user: UserDTO | null
  status: AuthStatus

  /** 登录成功 / 启动校验通过时写入 */
  setAuth: (token: string, user: UserDTO) => void
  /** 仅更新当前用户（如 credits 变化后刷新） */
  setUser: (user: UserDTO) => void
  /** 登出 / 401 时清空：store + sessionStorage */
  clear: () => void
}

function readStoredToken(): string | null {
  return TOKEN_STORAGE?.getItem(TOKEN_KEY) ?? null
}

export const useAuthStore = create<AuthState>((set) => ({
  token: readStoredToken(),
  user: null,
  status: 'idle',

  setAuth: (token, user) => {
    TOKEN_STORAGE?.setItem(TOKEN_KEY, token)
    set({ token, user, status: 'authenticated' })
  },
  setUser: (user) => set({ user }),
  clear: () => {
    TOKEN_STORAGE?.removeItem(TOKEN_KEY)
    set({ token: null, user: null, status: 'unauthenticated' })
  },
}))

/**
 * 非 hook 场景的访问点（lib/request.ts 等纯逻辑层用）。
 * zustand 的 hook 对象自带 getState/setState，可脱离 React 使用。
 */
export const authStore = useAuthStore
