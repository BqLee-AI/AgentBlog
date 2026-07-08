/**
 * slug 生成（详见 docs/design/06 §三）
 *
 * 📌 slug 用于 Agent 与人长期引用，必须稳定（需求 §1.2/§5）。
 *
 * 策略：
 *   - 英文/数字/连字符标题：转 kebab，用原词（如 "Hello World" → "hello-world"）
 *   - 中文或其它非 ASCII 标题：用「时间戳36进制 + 随机后缀」保证唯一，不依赖拼音库
 *
 * 不在调用处做唯一性兜底：posts.slug 有 UNIQUE 约束，发布时若极端碰撞，
 * DB 会抛 SQLITE_CONSTRAINT_UNIQUE，由 service 转成 CONFLICT。
 */
import { randomBytes } from 'node:crypto'

/** 把标题转成 slug。形如 hello-world 或 lq1234-a3f9k2，截断 ≤80 字符。 */
export function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, '') // 仅保留字母数字下划线、中文、空白、连字符
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  // 纯 ASCII（英文/数字/连字符）直接用原词；否则用短 ID 避免拼音转换依赖
  const isAscii = /^[\w-]+$/.test(base)
  const stem = isAscii && base ? base : Date.now().toString(36)
  const suffix = randomBytes(3).toString('hex') // 6 hex 字符防碰撞
  return `${stem}-${suffix}`.slice(0, 80)
}
