/**
 * 存储抽象 + 本地实现（详见 docs/design/11 §二）
 *
 * 设计要点：
 *   - 定义统一 Storage 接口，本地与未来 S3/OSS 可互换（v1 只实现 LocalStorage）
 *   - 🔴 路径遍历防护：文件名用 randomUUID()，不用用户原始文件名（需求 §4.2/§安全）
 *   - 上传成功返回可访问 url（落库用）+ key（删除用）+ size
 *
 * 是 lib（纯函数 + 文件 IO），不访问 DB；落库由各实体更新接口负责。
 */
import { mkdir, writeFile, unlink } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { env } from '@/config/env'

/** 存储结果：url 落库用，key 删除用 */
export interface StorageResult {
  /** 可访问的 URL（前端写入 coverUrl/avatarUrl 用） */
  url: string
  /** 存储内部 key（删除用，形如 cover/<uuid>.png） */
  key: string
  /** 文件字节数 */
  size: number
}

/** 存储抽象接口，本地与对象存储实现互换 */
export interface Storage {
  save(file: File, dir: string): Promise<StorageResult>
  delete(key: string): Promise<void>
}

// ---------- 本地实现 ----------
class LocalStorage implements Storage {
  constructor(private readonly baseUrl = '/uploads') {}

  async save(file: File, dir: string): Promise<StorageResult> {
    // 🔴 用原扩展名（小写）+ randomUUID，不用用户原始文件名（防遍历/防冲突）
    const ext = extname(file.name).toLowerCase()
    const filename = `${randomUUID()}${ext}`
    const relPath = `${dir}/${filename}`
    const absPath = join(env.UPLOAD_DIR, dir, filename)

    // 确保目录存在（recursive 幂等）
    await mkdir(join(env.UPLOAD_DIR, dir), { recursive: true })
    const buf = Buffer.from(await file.arrayBuffer())
    await writeFile(absPath, buf)

    return { url: `${this.baseUrl}/${relPath}`, key: relPath, size: file.size }
  }

  async delete(key: string): Promise<void> {
    // 静默忽略不存在（删除是清理动作，不应因文件缺失抛错）
    await unlink(join(env.UPLOAD_DIR, key)).catch(() => {})
  }
}

/** 存储单例。未来可换 S3Storage：export const storage = new S3Storage({...}) */
export const storage: Storage = new LocalStorage()
