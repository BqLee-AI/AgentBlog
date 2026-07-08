/**
 * 前端环境变量：类型化读取 + zod 构建期校验。
 *
 * 与后端 apps/api/src/config/env.ts 思路一致：启动即失败，胜过运行时 undefined。
 * 注意：Vite 只对 VITE_ 前缀变量注入客户端；前端 env 绝不含后端密钥。
 */
import { z } from 'zod'

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().default(''),
})

// 构建期解析，失败立即抛
const parsed = envSchema.parse(import.meta.env)

export const env = {
  /** 后端 API 基址；开发期留空走 vite proxy，生产期留空走 Nginx 同源反代 */
  apiBaseUrl: parsed.VITE_API_BASE_URL,
} as const

export type Env = typeof env
