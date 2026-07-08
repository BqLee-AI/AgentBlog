/**
 * 上传 API 层。
 *
 * 契约：docs/design/11 §三/§五
 *   - POST /api/upload，multipart/form-data
 *   - 字段：file（必填，File）+ purpose（可选，默认 cover，avatar/cover/misc）
 *   - 成功 201 → { url, key, size }（经 request 解包后 OkResponse.data）
 *   - 需登录（Bearer），request 自动注入
 *
 * 安全：multipart 由浏览器带 boundary，request 层 multipart:true 不手设 Content-Type，
 *       后端 Hono c.req.parseBody() 才能解析。
 */
import { request } from '@/lib/request'

export type UploadPurpose = 'avatar' | 'cover' | 'misc'

export interface UploadResult {
  /** 上传后的可访问 URL（如 /uploads/cover/uuid.png） */
  url: string
  /** 存储键（如 cover/uuid.png） */
  key: string
  /** 文件大小（字节） */
  size: number
}

export const uploadApi = {
  /** 上传单张图片 */
  uploadImage(file: File, purpose: UploadPurpose = 'cover', signal?: AbortSignal) {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('purpose', purpose)
    // exactOptionalPropertyTypes：signal 可能 undefined，条件拼装
    const opts = { method: 'POST', body: fd, multipart: true } as const
    return request<UploadResult>(
      '/api/upload',
      signal ? { ...opts, signal } : opts,
    )
  },
}
