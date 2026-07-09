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
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">用户管理</h1>
        <p className="text-sm text-muted-foreground">
          仅覆盖用户列表、角色调整与充值。管理员代建用户属于 `#43`，本次不纳入范围。
        </p>
      </div>

      {usersQuery.isLoading ? (
        <ListSkeleton rows={6} />
      ) : usersQuery.error ? (
        <ErrorState
          message={usersQuery.error instanceof Error ? usersQuery.error.message : '加载用户列表失败'}
          onRetry={() => void usersQuery.refetch()}
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">用户名</th>
                  <th className="px-4 py-3 font-medium">角色</th>
                  <th className="px-4 py-3 font-medium">额度</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((item) => {
                  const isSelf = item.id === currentUser?.id

                  return (
                    <tr key={item.id} className="border-t align-top">
                      <td className="px-4 py-3 font-medium">{item.username}</td>
                      <td className="px-4 py-3">{item.role}</td>
                      <td className="px-4 py-3">{item.credits}</td>
                      <td className="px-4 py-3">{STATUS_LABELS[item.status]}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
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
                              <span className="px-2 py-1 text-xs text-muted-foreground">
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

          <div className="flex items-center justify-between gap-3">
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
        </>
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
