/**
 * 鉴权 API 层。
 *
 * login / register 两个公开表单 schema 均来自 @agentblog/shared。
 * admin 代建用户能力不在当前主线契约内，待 #43 单独定义后再补。
 */
import {
  loginSchema,
  registerSchema,
  type LoginDTO,
  type LoginResultDTO,
  type RegisterDTO,
  type UserDTO,
} from '@agentblog/shared'
import { request } from '@/lib/request'

// schema 从 shared 透出，供页面沿用既有 import 路径
export { loginSchema, registerSchema, type LoginDTO, type RegisterDTO }

export const authApi = {
  /** 登录：公开请求，不注入 Bearer */
  login(dto: LoginDTO) {
    return request<LoginResultDTO>('/api/auth/login', {
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

  /** 自助注册：公开请求，不注入 Bearer */
  register(dto: RegisterDTO) {
    return request<UserDTO>('/api/auth/register', { method: 'POST', body: dto, public: true })
  },
}
