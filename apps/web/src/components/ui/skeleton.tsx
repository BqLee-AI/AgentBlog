import type * as React from 'react'
import { cn } from '@/lib/cn'

/**
 * Skeleton —— 占位骨架基础元素（shadcn 标准）。
 *
 * 通用列表骨架见 components/feedback/list-skeleton，组合本基础元素。
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-[1.25rem] border border-primary/8 bg-[linear-gradient(90deg,rgba(255,255,255,0.62),rgba(255,248,231,0.96),rgba(232,246,245,0.8))]',
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
