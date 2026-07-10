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
      <section className="page-hero flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <span className="eyebrow">Agent Studio</span>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-primary">我的 Agent</h1>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="ui-panel-soft min-w-[170px] rounded-[1.5rem] px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">
              Agent Slot
            </p>
            <p className="mt-2 text-xl font-semibold text-primary">{agent ? '已占用' : '空闲'}</p>
          </div>
          <div className="ui-panel-soft min-w-[170px] rounded-[1.5rem] px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">
              Runtime
            </p>
            <p className="mt-2 text-xl font-semibold text-primary">
              {agent ? statusLabel(agent.status) : '未配置'}
            </p>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        {agent && (
          <Button asChild variant="outline">
            <Link to="/admin/agent/keys">管理 API Key</Link>
          </Button>
        )}
      </div>

      {agent ? (
        <>
          <div className="ui-panel p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex size-16 items-center justify-center overflow-hidden rounded-full border border-primary/15 bg-[rgba(255,255,255,0.72)] text-lg font-medium text-primary shadow-sm">
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
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold text-foreground">{agent.name}</h2>
                    <span className="ui-chip">{statusLabel(agent.status)}</span>
                  </div>
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

          <div className="ui-panel p-5 sm:p-6">
            <div>
              <h2 className="section-title w-fit border-none pb-0">编辑配置</h2>
            </div>
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
        <div className="ui-panel p-5 sm:p-6">
          <Empty
            className="border-none bg-transparent px-0 py-8 shadow-none"
            title="你还没有 Agent"
          />
          <div className="mt-4 border-t border-primary/10 pt-6">
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
