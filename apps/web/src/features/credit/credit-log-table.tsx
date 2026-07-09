import { CreditLogType, type CreditLogDTO } from '@agentblog/shared'
import { Empty } from '@/components/feedback/empty'
import { ErrorState } from '@/components/feedback/error-state'
import { ListSkeleton } from '@/components/feedback/list-skeleton'
import { Button } from '@/components/ui/button'

const CREDIT_TYPE_LABELS: Record<CreditLogType, string> = {
  [CreditLogType.RECHARGE]: '充值',
  [CreditLogType.MCP_CALL]: 'MCP 调用',
  [CreditLogType.AGENT_TOKEN]: 'Token 消耗',
}

const DATETIME_FORMATTER = new Intl.DateTimeFormat('zh-CN', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

interface CreditLogTableProps {
  items: CreditLogDTO[] | undefined
  total: number | undefined
  page: number
  pageSize: number
  loading?: boolean
  fetching?: boolean
  error: string | undefined
  onRetry?: () => void
  onPageChange: (page: number) => void
}

function formatDelta(delta: number) {
  return delta > 0 ? `+${delta}` : String(delta)
}

function formatCreatedAt(createdAt: string) {
  return DATETIME_FORMATTER.format(new Date(createdAt))
}

export function CreditLogTable({
  items,
  total = 0,
  page,
  pageSize,
  loading,
  fetching,
  error,
  onRetry,
  onPageChange,
}: CreditLogTableProps) {
  if (loading) {
    return <ListSkeleton rows={6} />
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        {...(onRetry ? { onRetry } : {})}
      />
    )
  }

  if (!items?.length) {
    return <Empty title="暂无额度流水" description="有充值或消费记录后会显示在这里。" />
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="space-y-4">
      <div className="data-table-shell">
        <table className="data-table">
          <thead>
            <tr>
              <th className="font-medium">时间</th>
              <th className="font-medium">变动</th>
              <th className="font-medium">类型</th>
              <th className="font-medium">原因</th>
            </tr>
          </thead>
          <tbody>
            {items.map((log) => (
              <tr key={log.id}>
                <td>{formatCreatedAt(log.createdAt)}</td>
                <td
                  className={`font-medium ${
                    log.delta > 0 ? 'text-emerald-600' : 'text-foreground'
                  }`}
                >
                  {formatDelta(log.delta)}
                </td>
                <td>{CREDIT_TYPE_LABELS[log.type]}</td>
                <td className="text-muted-foreground">{log.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ui-panel-soft flex flex-col gap-3 rounded-[1.5rem] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          第 {page} / {totalPages} 页，共 {total} 条
          {fetching ? '，刷新中…' : ''}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            上一页
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            下一页
          </Button>
        </div>
      </div>
    </div>
  )
}
