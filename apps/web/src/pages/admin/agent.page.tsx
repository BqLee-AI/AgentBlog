import { Link } from 'react-router-dom'
import {
  AgentStatus,
  type CreateAgentDTO,
  type UpdateAgentDTO,
} from '@agentblog/shared'
import { AgentForm } from '@/features/agent/agent-form'
import {
  useCreateAgentMutation,
  useDeleteAgentMutation,
  useMyAgent,
  useUpdateAgentMutation,
} from '@/features/agent/use-my-agent'
import { ErrorState } from '@/components/feedback/error-state'
import { Empty } from '@/components/feedback/empty'
import { ListSkeleton } from '@/components/feedback/list-skeleton'
import { Button } from '@/components/ui/button'

function statusLabel(status: AgentStatus) {
  return status === AgentStatus.ACTIVE ? '启用中' : '已停用'
}

export default function AdminAgentPage() {
  const agentQuery = useMyAgent()
  const createAgent = useCreateAgentMutation()
  const updateAgent = useUpdateAgentMutation()
  const deleteAgent = useDeleteAgentMutation()

  if (agentQuery.isPending) {
    return <ListSkeleton rows={3} />
  }

  if (agentQuery.isError) {
    return (
      <ErrorState
        message={agentQuery.error.message}
        onRetry={() => agentQuery.refetch()}
      />
    )
  }

  const agent = agentQuery.data

  const handleDelete = async () => {
    if (!agent) return
    const confirmed = window.confirm(
      '删除 Agent 会级联影响它的 API Key。确认继续吗？',
    )
    if (!confirmed) return
    await deleteAgent.mutateAsync(agent.id)
  }

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">我的 Agent</h1>
          <p className="text-sm text-muted-foreground">
            每个用户最多维护 1 个 Agent，可在这里配置头像、系统提示词和运行状态。
          </p>
        </div>
        {agent && (
          <Button asChild variant="outline">
            <Link to="/admin/agent/keys">管理 API Key</Link>
          </Button>
        )}
      </div>

      {agent ? (
        <>
          <div className="rounded-xl border bg-card p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex size-16 items-center justify-center overflow-hidden rounded-full border bg-muted text-lg font-medium">
                  {agent.avatarUrl ? (
                    <img
                      src={agent.avatarUrl}
                      alt={agent.name}
                      className="size-full object-cover"
                    />
                  ) : (
                    agent.name.slice(0, 1).toUpperCase()
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">{agent.name}</h2>
                    <span className="rounded-full bg-secondary px-2 py-1 text-xs font-medium">
                      {statusLabel(agent.status)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    删除后，关联的 API Key 会一并失效；后续需要重新签发。
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteAgent.isPending}
              >
                {deleteAgent.isPending ? '删除中…' : '删除 Agent'}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <h2 className="text-lg font-semibold">编辑配置</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              这里修改的是当前 Agent 本身，不涉及 API Key 明文存储。
            </p>
            <div className="mt-6">
              <AgentForm
                initialValues={agent}
                submitLabel="保存 Agent 配置"
                submitting={updateAgent.isPending}
                onSubmit={async (values) =>
                  updateAgent.mutateAsync({
                    id: agent.id,
                    dto: values as UpdateAgentDTO,
                  }).then(() => undefined)
                }
              />
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-xl border bg-card p-5">
          <Empty
            className="py-10"
            title="你还没有 Agent"
            description="创建后才能进入在线对话和 API Key 管理。"
          />
          <div className="border-t pt-6">
            <AgentForm
              submitLabel="创建 Agent"
              submitting={createAgent.isPending}
              onSubmit={async (values) =>
                createAgent.mutateAsync(values as CreateAgentDTO).then(() => undefined)
              }
            />
          </div>
        </div>
      )}
    </section>
  )
}
