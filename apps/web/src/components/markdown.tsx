/**
 * Markdown —— 文章正文渲染器。
 *
 * 用 react-markdown + remark-gfm 渲染 GFM（表格/删除线/任务列表）。
 * 排版用 tailwindcss/typography 的 prose 类（#02 已在 tailwind.config 启用）。
 *
 * 安全：默认【不】启用 rehype-raw（避免用户/Agent 写的原生 HTML 造成 XSS）。
 *       确需原生 HTML 再开且配 sanitize（见 docs/design/frontend/05 §六）。
 *       封面图 URL 来自后端校验过的 coverUrl，相对安全，但 img 仍走默认转义。
 */
import type { ComponentPropsWithoutRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { cn } from '@/lib/cn'

interface MarkdownProps {
  content: string
  className?: string
}

export function Markdown({ content, className }: MarkdownProps) {
  return (
    <div className={cn('prose prose-slate max-w-none dark:prose-invert', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // 图片懒加载 + 圆角
          img: ({ ...props }: ComponentPropsWithoutRef<'img'>) => (
            <img {...props} loading="lazy" className="rounded-md" />
          ),
          // 外链新窗口打开 + 防 referrer 泄漏
          a: ({ ...props }: ComponentPropsWithoutRef<'a'>) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
