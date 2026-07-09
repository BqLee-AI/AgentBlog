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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">
            {targetUserId ? `${targetUser?.username ?? `用户 #${targetUserId}`} 的额度流水` : '我的额度流水'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {currentCredits === null
              ? '当前额度：未携带目标用户快照，本页仅展示流水，不开放充值。'
              : `当前额度：${currentCredits} credits`}
          </p>
        </div>

        {targetUserId && (
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => navigate('/admin/users')}>
              返回用户管理
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/admin/credits')}>
              查看我的流水
            </Button>
          </div>
        )}
      </div>

      {targetUserId && canViewOtherUsers && targetUser && (
        <RechargeForm
          targetUser={targetUser}
          submitting={rechargeCredits.isPending}
          submitLabel="给该用户充值"
          onSubmit={handleRecharge}
        />
      )}

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
    </div>
  )
}
