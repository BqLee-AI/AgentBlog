/**
 * PageSkeleton —— 路由懒加载期的占位骨架。
 *
 * 挂在 RootProviders 的 <Suspense fallback>，路由切换时（chunk 加载）显示。
 * shadcn 的 Skeleton 在 #6 组件体系落地后可替换；本期用 Tailwind 灰块。
 */
import { cn } from '@/lib/cn'

export function PageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('container mx-auto space-y-4 p-8', className)}>
      <div className="h-8 w-1/3 animate-pulse rounded bg-muted" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 w-full animate-pulse rounded bg-muted" />
        ))}
      </div>
    </div>
  )
}
