/**
 * 密码哈希（Bun 内置，零依赖）
 *
 * 使用 Bun.password，默认 argon2id（比 bcrypt 更现代、抗 GPU）。
 * verify 时 Bun 自动识别 hash 里的算法标识，未来迁移算法无需处理老 hash。
 *
 * 替代文档 04 篇原写的 bcryptjs 方案。
 */

/** 加密密码（用于注册 / 重置） */
export function hashPassword(plain: string): Promise<string> {
  return Bun.password.hash(plain)
}

/** 校验密码（用于登录） */
export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return Bun.password.verify(plain, hash)
}
