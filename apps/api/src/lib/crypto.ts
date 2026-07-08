/**
 * API Key 生成与哈希（详见 docs/design/07 §2.1）
 *
 * 🔴 不可逆存储红线（需求 §4.4）：
 *   - 明文 key 仅 generateApiKey 生成、issue 方法返回一次
 *   - DB 只存 SHA-256 哈希（hashApiKey），不存明文
 *   - 校验时对收到的 key 再 hash 一次，按 hash 查库
 */
import { createHash, randomBytes } from 'node:crypto'

const PREFIX = 'sk_live_'

/** 生成明文 key（仅签发时返回一次，DB 绝不存它） */
export function generateApiKey(): string {
  return PREFIX + randomBytes(24).toString('hex') // 48 hex 字符
}

/** 算 SHA-256 哈希（存储与查询都用它，64 位 hex） */
export function hashApiKey(plain: string): string {
  return createHash('sha256').update(plain).digest('hex')
}

/** 取展示前缀（sk_live_abcd…，不泄露完整 key） */
export function keyPrefix(plain: string): string {
  return plain.slice(0, PREFIX.length + 4) + '…'
}
