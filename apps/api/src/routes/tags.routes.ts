/**
 * 标签路由（详见 docs/design/06 §九）
 *
 * 挂载于 /api/tags（由 routes/index.ts 聚合）。
 * 标签不再由用户显式管理（建/删）——发文时自由输入标签名字符串，后端 findOrCreateMany 自动 upsert。
 * 故本路由仅保留：
 *   - GET /（公开，列出全部标签，供阅读页标签云 / 筛选展示）
 */
import { Hono } from 'hono'
import { ok } from '@/lib/response'
import { tagService } from '@/modules/tag/tag.service'

export const tagsRoutes = new Hono()

// 公开：列出全部标签
tagsRoutes.get('/', async (c) => {
  return ok(c, await tagService.list())
})
