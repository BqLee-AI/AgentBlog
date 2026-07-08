/**
 * 应用入口
 *
 * 读取并校验环境变量（启动即失败），启动 Bun HTTP 服务。
 * Hono + Bun 推荐写法：default export { port, fetch }，
 * Bun 检测到 fetch 会自动喂给 Bun.serve()。
 */
import { app } from '@/app'
import { env } from '@/config/env'

export default {
  port: env.PORT,
  fetch: app.fetch,
}
