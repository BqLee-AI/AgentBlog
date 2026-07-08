/**
 * 路由聚合层（详见 docs/design/02 §五）
 *
 * 各业务模块路由在此聚合，统一挂载到 /api 下。
 * 随模块就位后逐步接入：
 *   api.route('/auth', auth)              ← #3 接入
 *   api.route('/users', usersRoutes)      ← #17 接入
 *   api.route('/agents', agentsRoutes)    ← #19 接入
 *   api.route('/api-keys', apiKeysRoutes) ← #19 接入
 *   api.route('/credits', creditsRoutes)  ← #20 接入
 *   api.route('/posts', posts)   // TODO 任务 7
 *   ...
 */
import { Hono } from 'hono'
import { auth } from './auth.routes'
import { usersRoutes } from './users.routes'
import { agentsRoutes } from './agents.routes'
import { apiKeysRoutes } from './api-keys.routes'
import { creditsRoutes } from './credits.routes'

export const api = new Hono()

api.route('/auth', auth)
api.route('/users', usersRoutes)
api.route('/agents', agentsRoutes)
api.route('/api-keys', apiKeysRoutes)
api.route('/credits', creditsRoutes)
