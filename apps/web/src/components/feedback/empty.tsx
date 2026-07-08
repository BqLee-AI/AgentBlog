import type { ReactNode } from 'react'

interface EmptyProps {
  title?: string
  description?: string
  action?: ReactNode
}

export function Empty({
  title = '暂无数据',
  description,
  action,
}: EmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-16 text-center">
      <p className="text-lg font-medium">{title}</p>
      {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
