import { ParticleField } from '@/components/effects/particle-field'
import { ChatInput } from '@/features/chat/chat-input'
import { ChatMessages } from '@/features/chat/chat-messages'
import { useAgentChat } from '@/features/chat/use-agent-chat'
import { useAuth } from '@/features/auth/use-auth'

export default function ChatPage() {
  const { user } = useAuth()
  const { messages, status, errorMessage, canRetry, input, handleInputChange, handleSubmit, retry, stop } = useAgentChat()

  return (
    <section className="relative overflow-hidden">
      <ParticleField />
      <div className="public-shell relative flex min-h-[calc(100vh-9rem)] flex-col gap-8 py-12 sm:py-16">
        <header className="max-w-2xl space-y-4">
          <span className="eyebrow">Agent Chat</span>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
            与我的 Agent 对话
          </h1>
        </header>

        <div className="signal-strip">
          <div>
            <p className="meta-kicker">Session</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {user ? `${user.username} · ${user.role}` : '未登录'}
            </p>
          </div>
          <div className="flex items-baseline gap-2 text-sm text-muted-foreground">
            <span className="meta-kicker">Credits</span>
            <span className="text-2xl font-semibold tracking-tight text-foreground">
              {user?.credits ?? '-'}
            </span>
          </div>
        </div>

        <div className="editorial-card flex min-h-[560px] flex-1 flex-col overflow-hidden">
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
      </div>
    </section>
  )
}
