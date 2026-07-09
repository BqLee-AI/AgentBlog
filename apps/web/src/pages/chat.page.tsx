import { ChatInput } from '@/features/chat/chat-input'
import { ChatMessages } from '@/features/chat/chat-messages'
import { useAgentChat } from '@/features/chat/use-agent-chat'
import { useAuth } from '@/features/auth/use-auth'

export default function ChatPage() {
  const { user } = useAuth()
  const { messages, status, errorMessage, canRetry, input, handleInputChange, handleSubmit, retry, stop } = useAgentChat()

  return (
    <section className="page-shell flex min-h-0 flex-1 max-w-5xl flex-col">
      <div className="ui-panel flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-primary/10 px-5 py-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">与我的 Agent 对话</h1>
            <p className="text-sm text-muted-foreground">
              基于流式响应实时生成内容；工具调用结果会展示在消息中。
            </p>
          </div>

          <div className="ui-panel-soft rounded-[1.25rem] px-4 py-3 text-sm">
            <p className="text-muted-foreground">当前额度</p>
            <p className="mt-1 text-lg font-semibold">{user?.credits ?? '-'}</p>
          </div>
        </div>

        <ChatMessages
          messages={messages}
          status={status}
          errorMessage={errorMessage}
          canRetry={canRetry}
          onRetry={retry}
        />

        <ChatInput
          input={input}
          onChange={handleInputChange}
          onSubmit={handleSubmit}
          onStop={stop}
          disabled={status === 'submitted' || status === 'streaming'}
          isStreaming={status === 'submitted' || status === 'streaming'}
        />
      </div>
    </section>
  )
}
