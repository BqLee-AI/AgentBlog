import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ApiKeyStatus,
  type IssueApiKeyDTO,
  type IssueApiKeyResultDTO,
} from '@agentblog/shared'
import { toast } from 'sonner'
import { Empty } from '@/components/feedback/empty'
import { ErrorState } from '@/components/feedback/error-state'
import { ListSkeleton } from '@/components/feedback/list-skeleton'
import { Button } from '@/components/ui/button'
import { IssueApiKeyForm } from '@/features/api-key/issue-api-key-form'
import {
  useApiKeys,
  useIssueApiKeyMutation,
  useRevokeApiKeyMutation,
} from '@/features/api-key/use-api-keys'
import { useMyAgent } from '@/features/agent/use-my-agent'

function formatTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', {
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminApiKeysPage() {
  const agentQuery = useMyAgent()
  const agent = agentQuery.data
  const apiKeysQuery = useApiKeys(agent?.id)
  const issueApiKey = useIssueApiKeyMutation()
  const revokeApiKey = useRevokeApiKeyMutation()
  const [issuedKey, setIssuedKey] = useState<IssueApiKeyResultDTO | null>(null)

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

  if (!agent) {
    return (
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <section className="page-hero space-y-3">
          <span className="eyebrow">Access Keys</span>
          <h1 className="text-3xl font-semibold tracking-tight text-primary">API Key</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            API Key 归属于你的 Agent。请先创建 Agent，再回来签发 Key。
          </p>
        </section>

        <div className="ui-panel p-5 sm:p-6">
          <Empty
            title="当前还没有可绑定的 Agent"
            description="按设计约束，每个用户最多 1 个 Agent，Key 也只会挂在这个 Agent 下。"
            action={(
              <Button asChild>
                <Link to="/admin/agent">前往创建 Agent</Link>
              </Button>
            )}
          />
        </div>
      </section>
    )
  }

  const handleIssue = async (values: IssueApiKeyDTO) => {
    const result = await issueApiKey.mutateAsync({
      agentId: agent.id,
      dto: values,
    })
    setIssuedKey(result)
  }

  const handleCopy = async () => {
    if (!issuedKey) return
    try {
      await navigator.clipboard.writeText(issuedKey.key)
      toast.success('已复制到剪贴板')
    } catch {
      toast.error('复制失败，请手动复制')
    }
  }

  const handleRevoke = async (keyId: number) => {
    const confirmed = window.confirm('吊销后该 Key 立即失效，确认继续吗？')
    if (!confirmed) return

    await revokeApiKey.mutateAsync({
      agentId: agent.id,
      keyId,
    })
  }

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <section className="page-hero flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <span className="eyebrow">Access Keys</span>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-primary">API Key</h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              为 Agent「{agent.name}」签发和吊销 API Key。明文只会在签发成功的那一刻展示一次。
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="ui-panel-soft min-w-[180px] rounded-[1.5rem] px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">
              Bound Agent
            </p>
            <p className="mt-2 text-xl font-semibold text-primary">{agent.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">所有 Key 都归属该 Agent</p>
          </div>
          <div className="ui-panel-soft min-w-[180px] rounded-[1.5rem] px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">
              Issued Keys
            </p>
            <p className="mt-2 text-xl font-semibold text-primary">
              {apiKeysQuery.data?.length ?? 0}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">已签发列表中的 Key 数量</p>
          </div>
        </div>
      </section>

      {issuedKey && (
        <div className="ui-panel-soft p-5 text-emerald-950 sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium">新 Key 已签发，请立即复制保存。</p>
              <div className="field-surface rounded-2xl bg-white/90 px-4 py-3 font-mono text-sm shadow-sm">
                {issuedKey.key}
              </div>
              <p className="text-xs text-emerald-800">
                关闭或刷新页面后，这串明文不会再次出现在列表中。
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={handleCopy}>
                复制 Key
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIssuedKey(null)}
              >
                我已保存
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div className="ui-panel p-5 sm:p-6">
          <h2 className="section-title w-fit border-none pb-0">签发新 Key</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            可选填写名称用于区分用途；真正的明文 key 不会进入持久化存储。
          </p>
          <div className="mt-6">
            <IssueApiKeyForm
              submitting={issueApiKey.isPending}
              onSubmit={handleIssue}
            />
          </div>
        </div>

        <div className="ui-panel p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="section-title w-fit border-none pb-0">已签发 Key</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                列表只展示前缀、状态和创建时间，不会返回明文。
              </p>
            </div>
          </div>

          <div className="mt-6">
            {apiKeysQuery.isPending ? (
              <ListSkeleton rows={4} />
            ) : apiKeysQuery.isError ? (
              <ErrorState
                message={apiKeysQuery.error.message}
                onRetry={() => apiKeysQuery.refetch()}
              />
            ) : apiKeysQuery.data.length === 0 ? (
              <Empty
                className="py-10"
                title="还没有 API Key"
                description="签发后，你可以用它访问 MCP / Agent 通道。"
              />
            ) : (
              <div className="space-y-3">
                {apiKeysQuery.data.map((key) => (
                  <div
                    key={key.id}
                    className="ui-panel-soft flex flex-col gap-3 rounded-[1.5rem] px-4 py-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                          {key.name || '未命名 Key'}
                        </span>
                        <span className="ui-chip">
                          {key.status === ApiKeyStatus.ACTIVE ? '可用' : '已吊销'}
                        </span>
                      </div>
                      <p className="font-mono text-sm text-muted-foreground">
                        {key.keyPrefix}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        创建于 {formatTime(key.createdAt)}
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      disabled={
                        key.status === ApiKeyStatus.REVOKED || revokeApiKey.isPending
                      }
                      onClick={() => handleRevoke(key.id)}
                    >
                      {key.status === ApiKeyStatus.REVOKED ? '已吊销' : '吊销'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
