/**
 * ListSkeleton —— 列表加载骨架。
 *
 * 列表查询 loading 时展示，行数可调（默认 5）。
 * 基于基础元素 components/ui/skeleton 组合。
 */
import { Skeleton } from '@/components/ui/skeleton'

interface ListSkeletonProps {
  rows?: number
  className?: string
}

export function ListSkeleton({ rows = 5, className }: ListSkeletonProps) {
  return (
    <div className={`space-y-3 ${className ?? ''}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  )
}
