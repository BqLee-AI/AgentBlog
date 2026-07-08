import type * as React from 'react'
import { cn } from '@/lib/cn'

/**
 * Skeleton —— 占位骨架基础元素（shadcn 标准）。
 *
 * 通用列表骨架见 components/feedback/list-skeleton，组合本基础元素。
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />
}

export { Skeleton }
