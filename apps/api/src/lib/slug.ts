/**
 * slug 生成（详见 docs/design/06 §三）
 *
 * 中文标题不强依赖拼音库：英文/数字标题走清洗后的 stem，
 * 其他情况退化到时间戳 + 短随机后缀，保证唯一且稳定。
 */
import { randomBytes } from 'node:crypto'

export function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  const isAscii = /^[\w-]+$/.test(base)
  const stem = isAscii && base ? base : Date.now().toString(36)
  const suffix = randomBytes(3).toString('hex')
  return `${stem}-${suffix}`.slice(0, 80)
}
