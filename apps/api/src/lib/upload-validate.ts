/**
 * 图片上传校验（详见 docs/design/11 §三）
 *
 * v1 信任 file.type（MIME 声明），不做 magic number 校验（11 §九明确不做）。
 * 仅放行 jpg/png/webp/gif；大小限 UPLOAD_MAX_SIZE_MB（默认 5MB）。
 */
import { env } from '@/config/env'
import { HttpError } from '@/lib/errors'

/** 允许的图片 MIME 白名单 */
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

/**
 * 校验上传的图片文件。不通过直接抛 HttpError.badRequest（400）。
 *   - MIME 不在白名单 → 400「不支持的图片类型」
 *   - size > UPLOAD_MAX_SIZE_MB → 400「图片不能超过 NMB」
 */
export function validateImage(file: File): void {
  if (!ALLOWED_MIME.has(file.type)) {
    throw HttpError.badRequest(`不支持的图片类型：${file.type || '未知'}，仅支持 jpg/png/webp/gif`)
  }
  const maxBytes = env.UPLOAD_MAX_SIZE_MB * 1024 * 1024
  if (file.size > maxBytes) {
    throw HttpError.badRequest(`图片不能超过 ${env.UPLOAD_MAX_SIZE_MB}MB`)
  }
}
