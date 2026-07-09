/**
 * Empty —— 通用空态展示（列表无数据、无搜索结果等）。
 *
 * 跨业务复用，不绑定具体领域。可选 action（如「新建」按钮）由调用方传入。
 */
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface EmptyProps {
  title?: string
  description?: string
  action?: ReactNode
  className?: string
}

export function Empty({
  title = '暂无数据',
  description,
  action,
  className,
}: EmptyProps) {
  return (
    <div className={cn('ui-panel-soft flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <p className="text-lg font-medium">{title}</p>
      {description && (
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
