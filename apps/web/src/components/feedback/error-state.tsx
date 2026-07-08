/**
 * ErrorState —— 局部错误态（非全局 ErrorBoundary 兜底的局部错误）。
 *
 * 如某个列表查询失败、某次操作失败，给用户「重试」入口。
 * 全局未捕获错误走 ErrorBoundary（#07）。
 */
import { Button } from '@/components/ui/button'

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
    <div
      className={`flex flex-col items-center justify-center gap-3 py-16 ${className ?? ''}`}
    >
      <p className="text-destructive">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          重试
        </Button>
      )}
    </div>
  )
}
