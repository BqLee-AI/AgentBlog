/**
 * 环境变量配置（启动时 Zod 校验，失败即退出）
 *
 * 详见 docs/design/01 §七。所有地方都从 @/config/env 读 env，
 * 禁止直接用 process.env.XXX。
 *
 * 注意：本项目使用 Zod 4。错误消息用 { error: '...' }（非裸字符串），
 * 错误结构用 z.treeifyError()（非已弃用的 flatten()）。
 */
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  // 数据库
  DATABASE_URL: z.string().default('./data/app.db'),

  // JWT
  JWT_SECRET: z.string().min(32, { error: 'JWT_SECRET 至少 32 字符' }),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // 超管（首次 seed）
  SUPER_ADMIN_USERNAME: z.string().min(3),
  SUPER_ADMIN_PASSWORD: z.string().min(6),

  // Credits 计费
  CREDITS_PER_MCP_CALL: z.coerce.number().int().positive().default(1),
  TOKENS_PER_CREDIT: z.coerce.number().int().positive().default(1000),

  // 在线 Agent
  AI_PROVIDER: z.enum(['openai', 'anthropic']).default('openai'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().url().optional(), // 可选：代理/第三方 OpenAI 兼容端点（DeepSeek/智谱/Ollama 等），留空走官方
  AI_MODEL: z.string().default('gpt-4o-mini'),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_BASE_URL: z.string().url().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-20250514'),

  // 图片上传
  UPLOAD_DIR: z.string().default('./data/uploads'),
  UPLOAD_MAX_SIZE_MB: z.coerce.number().int().positive().default(5),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ 环境变量校验失败：')
  // Zod 4：用 treeifyError 取代已弃用的 flatten()
  console.error(JSON.stringify(z.treeifyError(parsed.error), null, 2))
  process.exit(1)
}

export const env = parsed.data
export type Env = typeof env
