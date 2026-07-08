/**
 * 图片上传路由（详见 docs/design/11 §五）
 *
 * 挂载于 /api/upload（由 routes/index.ts 聚合）：
 *   POST /api/upload —— multipart/form-data，需登录
 *
 * 流程：parseBody → 取 file（须 File 实例）→ purpose 白名单定 dir → validateImage → storage.save → 返回 url
 * 🔴 不写 DB：只返回 url/key/size，落库由前端调各实体更新接口写入 coverUrl/avatarUrl。
 *
 * 安全：
 *   - dir 白名单（avatar/cover/misc）防路径注入
 *   - 文件名 randomUUID（在 storage 内），不用用户原名
 */
import { Hono } from 'hono'
import { ok } from '@/lib/response'
import { authMiddleware } from '@/middlewares/auth'
import { storage } from '@/lib/storage'
import { validateImage } from '@/lib/upload-validate'
import { HttpError } from '@/lib/errors'

/** purpose → 落盘子目录白名单（防 ../ 路径注入） */
const ALLOWED_PURPOSE = ['avatar', 'cover', 'misc'] as const

export const uploadRoutes = new Hono()

// 所有上传接口需登录（任意登录用户均可上传，无 RBAC 限制）
uploadRoutes.use('*', authMiddleware)

uploadRoutes.post('/', async (c) => {
  // Hono 原生解析 multipart/form-data，无需 multer 类中间件
  const body = await c.req.parseBody()
  const file = body.file
  if (!(file instanceof File)) {
    throw HttpError.badRequest('请上传 file 字段（multipart/form-data）')
  }

  // purpose 可选，默认 cover；非白名单值归到 misc（防恶意 purpose 注入路径）
  const purpose = (body.purpose as string) || 'cover'
  const dir = (ALLOWED_PURPOSE as readonly string[]).includes(purpose) ? purpose : 'misc'

  validateImage(file)
  const result = await storage.save(file, dir)

  return ok(c, result, 201)
})
