/**
 * 路由聚合层（详见 docs/design/02 §五）
 *
 * 各业务模块路由在此聚合，统一挂载到 /api 下。
 * 随模块就位后逐步接入：
 *   api.route('/auth', auth)     ← 本轮接入
 *   api.route('/users', users)   // TODO 任务 6
 *   api.route('/posts', posts)   // TODO 任务 7
 *   ...
 */
import { Hono } from 'hono'
import { auth } from './auth.routes'

export const api = new Hono()

api.route('/auth', auth)
