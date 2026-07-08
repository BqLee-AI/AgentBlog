/**
 * Placeholder —— 占位页面通用骨架。
 *
 * #5 阶段各业务页面是占位（真实内容由对应 issue 填）。
 * 统一展示页面标题 + 待实现提示，避免空白。
 */
interface PlaceholderProps {
  title: string
  /** 该页面由哪个 issue 实现，便于后续接手者定位 */
  implementedBy?: string
}

export function Placeholder({ title, implementedBy }: PlaceholderProps) {
  return (
    <main className="container mx-auto py-12">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-muted-foreground">
        此页面为路由占位，内容由后续 issue 实现。
        {implementedBy && <span className="ml-1 text-xs">（{implementedBy}）</span>}
      </p>
    </main>
  )
}
