/**
 * 鉴权 API 层。
 *
 * TODO(@agentblog/shared)：loginSchema / createUserSchema / LoginResult 尚未上提到 shared。
 * 后端 issue #3（auth 模块）落地后，把这两个 schema 与 LoginResult 类型上提到 shared，
 * 此处改为 `import { loginSchema } from '@agentblog/shared'`。
 *
 * 当前为前端本地定义（zod v3，与 RHF resolver 兼容），与后端 04 §五规则一致：
 * username 3–32、password ≥6。
 */
import { z } from 'zod'
import type { UserDTO } from '@agentblog/shared'
import { request } from '@/lib/request'

// ── 本地 schema（待上提 shared）──
export const loginSchema = z.object({
  username: z.string().min(3, '用户名至少 3 位').max(32, '用户名最多 32 位'),
  password: z.string().min(6, '密码至少 6 位'),
})
export type LoginDTO = z.infer<typeof loginSchema>

export const createUserSchema = z.object({
  username: z.string().min(3).max(32),
  password: z.string().min(6),
  // 不允许直接建超管（后端 04 §六：仅超管可建超管）。
  // 注意：shared.roleSchema 是 [super_admin, admin, user] 全集；此处本地排除 super_admin
  // 是建用户场景的业务约束，与 shared 并非重复定义。
  // TODO(上提 shared)：上提时协调——建议 shared 提供 createUserRoleSchema（排除 super_admin），
  // 或前端在 shared.roleSchema 基础上 .exclude(SUPER_ADMIN)，避免角色枚举出现三份。
  role: z.enum(['admin', 'user'] as const).default('user'),
  credits: z.number().int().min(0).default(0),
})
export type CreateUserDTO = z.infer<typeof createUserSchema>

export interface LoginResult {
  token: string
  user: UserDTO
}

export const authApi = {
  /** 登录：公开请求，不注入 Bearer */
  login(dto: LoginDTO) {
    return request<LoginResult>('/api/auth/login', {
      method: 'POST',
      body: dto,
      public: true,
    })
  },

  /** 获取当前用户：启动校验 + 刷新当前用户信息 */
  me(signal?: AbortSignal) {
    return request<UserDTO>(
      '/api/auth/me',
      signal ? { signal } : undefined,
    )
  },

  /** 创建用户：admin+ 权限（后端 04 §六） */
  register(dto: CreateUserDTO) {
    return request<UserDTO>('/api/auth/register', { method: 'POST', body: dto })
  },
}
