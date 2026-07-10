import { PAGINATION, Role, type RechargeDTO } from '@agentblog/shared'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { CreditLogTable } from '@/features/credit/credit-log-table'
import { RechargeForm } from '@/features/credit/recharge-form'
import {
  useMyCreditLogs,
  useRechargeCredits,
  useUserCreditLogs,
} from '@/features/credit/use-credits'
import { useAuth } from '@/features/auth/use-auth'

interface CreditsRouteState {
  targetUser?: {
    id: number
    username: string
    credits: number
  }
}

export default function AdminCreditsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [page, setPage] = useState<number>(PAGINATION.DEFAULT_PAGE)
  const [creditAdjustment, setCreditAdjustment] = useState(0)

  const state = location.state as CreditsRouteState | null
  const pageSize = PAGINATION.DEFAULT_PAGE_SIZE
  const rechargeCredits = useRechargeCredits()

  const requestedUserId = useMemo(() => {
    const raw = searchParams.get('userId')
    if (!raw) return undefined
    const parsed = Number(raw)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
  }, [searchParams])

  const canViewOtherUsers = user?.role === Role.ADMIN || user?.role === Role.SUPER_ADMIN
  const targetUserId = canViewOtherUsers ? requestedUserId : undefined
  const targetUser =
    targetUserId && state?.targetUser?.id === targetUserId ? state.targetUser : null

  useEffect(() => {
    setPage(PAGINATION.DEFAULT_PAGE)
    setCreditAdjustment(0)
  }, [targetUserId])

  const myLogsQuery = useMyCreditLogs({ page, pageSize })
  const userLogsQuery = useUserCreditLogs(targetUserId ?? -1, { page, pageSize })
  const logsQuery = targetUserId ? userLogsQuery : myLogsQuery

  const currentCredits = targetUserId
    ? targetUser
      ? targetUser.credits + creditAdjustment
      : null
    : user?.credits ?? null

  const handleRecharge = async (values: RechargeDTO) => {
    await rechargeCredits.mutateAsync(values)
    if (targetUserId === values.userId) {
      setCreditAdjustment((current) => current + values.amount)
    }
  }

  return (
    <div className="space-y-6">
      <section className="page-hero flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <span className="eyebrow">Credits Ledger</span>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-primary">
              {targetUserId ? `${targetUser?.username ?? `用户 #${targetUserId}`} 的额度流水` : '我的额度流水'}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {currentCredits === null
              ? '额度不可用'
              : `当前额度：${currentCredits} credits`}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="ui-panel-soft min-w-[180px] rounded-[1.5rem] px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">
              Active Scope
            </p>
            <p className="mt-2 text-xl font-semibold text-primary">
              {targetUserId ? '指定用户' : '当前账号'}
            </p>
          </div>
          <div className="ui-panel-soft min-w-[180px] rounded-[1.5rem] px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">
              Access
            </p>
            <p className="mt-2 text-xl font-semibold text-primary">
              {canViewOtherUsers ? 'Admin View' : 'Self View'}
            </p>
          </div>
        </div>
      </section>

      {targetUserId && (
        <div className="ui-panel-soft flex flex-col gap-3 rounded-[1.5rem] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => navigate('/admin/users')}>
              返回用户管理
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/admin/credits')}>
              查看我的流水
            </Button>
          </div>
        </div>
      )}

      {targetUserId && canViewOtherUsers && targetUser && (
        <RechargeForm
          targetUser={targetUser}
          submitting={rechargeCredits.isPending}
          submitLabel="给该用户充值"
          onSubmit={handleRecharge}
        />
      )}

      <section className="ui-panel space-y-5 p-5 sm:p-6">
        <h2 className="section-title w-fit border-none pb-0">流水明细</h2>

        <CreditLogTable
          items={logsQuery.data?.items}
          total={logsQuery.data?.total}
          page={page}
          pageSize={pageSize}
          loading={logsQuery.isLoading}
          fetching={logsQuery.isFetching}
          error={logsQuery.error instanceof Error ? logsQuery.error.message : undefined}
          onRetry={() => void logsQuery.refetch()}
          onPageChange={setPage}
        />
      </section>
    </div>
  )
}
