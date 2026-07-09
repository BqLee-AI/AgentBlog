import { PAGINATION, Role, UserStatus, type RechargeDTO, type UserDTO } from '@agentblog/shared'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ErrorState } from '@/components/feedback/error-state'
import { ListSkeleton } from '@/components/feedback/list-skeleton'
import { IfRole } from '@/components/if-role'
import { Button } from '@/components/ui/button'
import { RechargeForm } from '@/features/credit/recharge-form'
import { useRechargeCredits } from '@/features/credit/use-credits'
import { useAuth } from '@/features/auth/use-auth'
import { UserRoleForm } from '@/features/user/user-role-form'
import { useUpdateUserRole, useUsers } from '@/features/user/use-users'

const STATUS_LABELS: Record<UserStatus, string> = {
  [UserStatus.ACTIVE]: '启用',
  [UserStatus.DISABLED]: '禁用',
}

export default function AdminUsersPage() {
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const [page, setPage] = useState<number>(PAGINATION.DEFAULT_PAGE)
  const [roleTarget, setRoleTarget] = useState<UserDTO | null>(null)
  const [rechargeTarget, setRechargeTarget] = useState<UserDTO | null>(null)

  const pageSize = PAGINATION.DEFAULT_PAGE_SIZE
  const usersQuery = useUsers({ page, pageSize })
  const updateRole = useUpdateUserRole()
  const rechargeCredits = useRechargeCredits()

  const users = usersQuery.data?.items ?? []
  const total = usersQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const openRoleEditor = (targetUser: UserDTO) => {
    setRechargeTarget(null)
    setRoleTarget(targetUser)
  }

  const openRechargeEditor = (targetUser: UserDTO) => {
    setRoleTarget(null)
    setRechargeTarget(targetUser)
  }

  const handleViewLogs = (targetUser: UserDTO) => {
    navigate(`/admin/credits?userId=${targetUser.id}`, {
      state: {
        targetUser: {
          id: targetUser.id,
          username: targetUser.username,
          credits: targetUser.credits,
        },
      },
    })
  }

  const handleRoleSubmit = async (values: { role: UserDTO['role'] }) => {
    if (!roleTarget) return
    await updateRole.mutateAsync({ userId: roleTarget.id, dto: values })
    setRoleTarget(null)
  }

  const handleRechargeSubmit = async (values: RechargeDTO) => {
    await rechargeCredits.mutateAsync(values)
    setRechargeTarget(null)
  }

  return (
    <div className="space-y-6">
      <section className="page-hero flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <span className="eyebrow">User Ops</span>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-primary">用户管理</h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              统一处理角色、额度和流水入口，方便管理员从一个列表完成主要运营动作。
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            仅覆盖用户列表、角色调整与充值。管理员代建用户属于 `#43`，本次不纳入范围。
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="ui-panel-soft min-w-[180px] rounded-[1.5rem] px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">
              Visible Users
            </p>
            <p className="mt-2 text-3xl font-semibold text-primary">{total}</p>
            <p className="mt-1 text-sm text-muted-foreground">当前分页总用户数</p>
          </div>
          <div className="ui-panel-soft min-w-[180px] rounded-[1.5rem] px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">
              Page Status
            </p>
            <p className="mt-2 text-3xl font-semibold text-primary">
              {page}/{totalPages}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">每页 {pageSize} 位用户</p>
          </div>
        </div>
      </section>

      {usersQuery.isLoading ? (
        <ListSkeleton rows={6} />
      ) : usersQuery.error ? (
        <ErrorState
          message={usersQuery.error instanceof Error ? usersQuery.error.message : '加载用户列表失败'}
          onRetry={() => void usersQuery.refetch()}
        />
      ) : users.length === 0 ? (
        <div className="ui-panel-soft px-6 py-12 text-center text-sm text-muted-foreground">
          当前没有可管理的用户数据。
        </div>
      ) : (
        <section className="ui-panel space-y-5 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="section-title w-fit border-none pb-0">用户列表</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                支持直接查看额度流水、发起充值以及按权限调整角色。
              </p>
            </div>
            <div className="ui-chip">
              {usersQuery.isFetching ? '列表刷新中' : '列表已同步'}
            </div>
          </div>

          <div className="data-table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="font-medium">用户名</th>
                  <th className="font-medium">角色</th>
                  <th className="font-medium">额度</th>
                  <th className="font-medium">状态</th>
                  <th className="font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((item) => {
                  const isSelf = item.id === currentUser?.id

                  return (
                    <tr key={item.id} className="align-top">
                      <td className="font-medium text-foreground">{item.username}</td>
                      <td>{item.role}</td>
                      <td>{item.credits}</td>
                      <td>{STATUS_LABELS[item.status]}</td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => openRechargeEditor(item)}
                          >
                            充值
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewLogs(item)}
                          >
                            查看流水
                          </Button>
                          <IfRole roles={[Role.SUPER_ADMIN]}>
                            {!isSelf ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => openRoleEditor(item)}
                              >
                                改角色
                              </Button>
                            ) : (
                              <span className="ui-chip text-xs text-muted-foreground">
                                不能修改自己
                              </span>
                            )}
                          </IfRole>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="ui-panel-soft flex flex-col gap-3 rounded-[1.5rem] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              第 {page} / {totalPages} 页，共 {total} 位用户
              {usersQuery.isFetching ? '，刷新中…' : ''}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
              >
                上一页
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
              >
                下一页
              </Button>
            </div>
          </div>
        </section>
      )}

      {rechargeTarget && (
        <RechargeForm
          targetUser={rechargeTarget}
          submitting={rechargeCredits.isPending}
          onCancel={() => setRechargeTarget(null)}
          onSubmit={handleRechargeSubmit}
        />
      )}

      {roleTarget && (
        <UserRoleForm
          user={roleTarget}
          submitting={updateRole.isPending}
          onCancel={() => setRoleTarget(null)}
          onSubmit={handleRoleSubmit}
        />
      )}
    </div>
  )
}
