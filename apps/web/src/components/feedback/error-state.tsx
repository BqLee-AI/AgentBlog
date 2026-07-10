/**
 * ErrorState —— 局部错误态（非全局 ErrorBoundary 兜底的局部错误）。
 *
 * 如某个列表查询失败、某次操作失败，给用户「重试」入口。
 * 全局未捕获错误走 ErrorBoundary（#07）。
 */
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  message = '加载失败',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn('ui-panel flex flex-col items-center justify-center gap-4 px-6 py-12 text-center', className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(239,108,74,0.14)] text-lg text-destructive">
        !
      </div>
      <p className="max-w-xl text-sm font-medium text-destructive">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          重试
        </Button>
      )}
    </div>
  )
}
