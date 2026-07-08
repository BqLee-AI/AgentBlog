/**
 * 鉴权 API 层。
 *
 * loginSchema 已上提到 @agentblog/shared（前后端共用，单一真相源）。
 *
 * createUserSchema 仍为前端本地定义（admin 建用户场景：含 role/credits），
 * 与后端自助注册 registerSchema（不含 role/credits、.strict()）规则不同，
 * 不能强行合并。TODO(#11 用户管理)：待后端定义 admin 建用户 DTO 后再上提 shared。
 */
import { z } from 'zod'
import { loginSchema, type LoginDTO, type UserDTO } from '@agentblog/shared'
import { request } from '@/lib/request'

// loginSchema 从 shared 透出，供 login.page.tsx 等沿用既有 import 路径
export { loginSchema, type LoginDTO }

export const createUserSchema = z.object({
  username: z.string().min(3, { error: '用户名至少 3 位' }).max(32, { error: '用户名最多 32 位' }),
  password: z.string().min(6, { error: '密码至少 6 位' }),
  // 不允许直接建超管（后端 04 §六：仅超管可建超管）。
  // 注意：shared.roleSchema 是 [super_admin, admin, user] 全集；此处本地排除 super_admin
  // 是建用户场景的业务约束，与 shared 并非重复定义。
  // TODO(#11)：上提 shared 时协调——建议 shared 提供 createUserRoleSchema（排除 super_admin），
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
