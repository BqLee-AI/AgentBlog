/**
 * Zod 错误工具（供 zod-check.ts + error-handler.ts 共用）
 *
 * 把 ZodError.issues（或具有相同 shape 的校验结果）按 path 拍平成
 * { fieldPath: [message1, message2] }，顶层错误归到 `_` 键。
 */
import type { ZodIssue } from 'zod'

/** 与 ZodError / SafeParseError 兼容的最小接口 */
interface IssuesContainer {
  issues: ZodIssue[]
}

/** 拍平 issues → { field: [messages] } */
export function zodIssuesToFields(source: IssuesContainer): Record<string, string[]> {
  const fields: Record<string, string[]> = {}
  for (const issue of source.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_'
    ;(fields[key] ??= []).push(issue.message)
  }
  return fields
}
