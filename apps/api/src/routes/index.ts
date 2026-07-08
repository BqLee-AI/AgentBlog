/**
 * 路由聚合层（详见 docs/design/02 §五）
 *
 * 当前先接入公开阅读端最小闭环：
 *   - /posts
 *   - /tags
 *
 * 其余 auth/users/agents/... 随后续 issue 逐步补齐。
 */
import { Hono } from 'hono'
import { posts } from './posts.routes'
import { tags } from './tags.routes'

export const api = new Hono()

api.route('/posts', posts)
api.route('/tags', tags)
