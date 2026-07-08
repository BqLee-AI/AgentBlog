/**
 * Spin —— 全屏/局部 loading 指示。
 *
 * RequireAuth 在启动校验期（status=loading）显示全屏 Spin。
 * 登录页提交时也可复用（按钮内 loading 文案）。
 */
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

interface SpinProps {
  fullscreen?: boolean
  tip?: string
  className?: string
}

export function Spin({ fullscreen, tip, className }: SpinProps) {
  const content = (
    <div className={cn('flex flex-col items-center justify-center gap-2 text-muted-foreground', className)}>
      <Loader2 className="size-6 animate-spin" />
      {tip && <span className="text-sm">{tip}</span>}
    </div>
  )

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">{content}</div>
    )
  }
  return content
}
