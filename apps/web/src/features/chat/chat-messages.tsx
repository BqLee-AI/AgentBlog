import { useEffect, useRef } from 'react'
import type { ChatStatus, UIMessage } from 'ai'
import { Bot, Loader2, RotateCcw, Sparkles, User, Wrench } from 'lucide-react'

import { Empty } from '@/components/feedback/empty'
import { Button } from '@/components/ui/button'
import { Markdown } from '@/components/markdown'
import { cn } from '@/lib/cn'

type ChatPart = UIMessage['parts'][number]
type ToolPart = Extract<ChatPart, { type: `tool-${string}` } | { type: 'dynamic-tool' }>

interface ChatMessagesProps {
  messages: UIMessage[]
  status: ChatStatus
  errorMessage: string | null
  canRetry: boolean
  onRetry: () => Promise<void> | void
}

function isToolPart(part: ChatPart): part is ToolPart {
  return part.type === 'dynamic-tool' || part.type.startsWith('tool-')
}

function stringifyPartValue(value: unknown) {
  try {
    const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
    return text.length > 1200 ? `${text.slice(0, 1200)}\n...` : text
  } catch {
    return String(value)
  }
}

function getToolName(part: ToolPart) {
  return part.type === 'dynamic-tool' ? part.toolName : part.type.slice(5)
}

function getToolStateLabel(part: ToolPart) {
  switch (part.state) {
    case 'input-streaming':
      return '正在准备工具输入'
    case 'input-available':
      return '已发起工具调用'
    case 'output-available':
      return '工具已返回结果'
    case 'output-error':
      return '工具执行失败'
    default:
      return '工具调用'
  }
}

function ToolCallView({ part }: { part: ToolPart }) {
  const toolName = getToolName(part)

  return (
    <div className="rounded-md border bg-background/80 p-3 text-xs text-foreground shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Wrench className="size-3.5" />
        <span className="font-medium">{toolName}</span>
        <span>{getToolStateLabel(part)}</span>
        {(part.state === 'input-streaming' || part.state === 'input-available') && (
          <Loader2 className="size-3 animate-spin" />
        )}
      </div>

      {part.input !== undefined && (
        <details className="mt-2">
          <summary className="cursor-pointer text-muted-foreground">查看输入</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded bg-muted/60 p-2">
            {stringifyPartValue(part.input)}
          </pre>
        </details>
      )}

      {part.state === 'output-available' && (
        <details className="mt-2" open>
          <summary className="cursor-pointer text-muted-foreground">查看结果</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded bg-muted/60 p-2">
            {stringifyPartValue(part.output)}
          </pre>
        </details>
      )}

      {part.state === 'output-error' && (
        <p className="mt-2 text-destructive">{part.errorText}</p>
      )}
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-2 text-sm text-muted-foreground shadow-sm">
        <Loader2 className="size-4 animate-spin" />
        Agent 正在回复…
      </div>
    </div>
  )
}

export function ChatMessages({ messages, status, errorMessage, canRetry, onRetry }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, status, errorMessage])

  return (
    <div className="flex-1 overflow-y-auto bg-muted/20 px-4 py-6">
      {messages.length === 0 ? (
        <Empty
          className="min-h-full"
          title="开始和你的 Agent 对话"
          description="可让它查询文章、执行工具；当前会话不会被保存。"
        />
      ) : (
        <div className="space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'flex max-w-[90%] gap-3',
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row',
                )}
              >
                <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground">
                  {message.role === 'user' ? <User className="size-4" /> : <Bot className="size-4" />}
                </div>

                <div
                  className={cn(
                    'space-y-3 rounded-2xl border px-4 py-3 shadow-sm',
                    message.role === 'user'
                      ? 'border-primary/20 bg-primary text-primary-foreground'
                      : 'bg-background',
                  )}
                >
                  {message.parts.map((part, index) => {
                    if (part.type === 'step-start') return null

                    if (part.type === 'text') {
                      if (message.role === 'user') {
                        return (
                          <p key={`${message.id}-text-${index}`} className="whitespace-pre-wrap text-sm leading-6">
                            {part.text}
                          </p>
                        )
                      }

                      return (
                        <Markdown
                          key={`${message.id}-text-${index}`}
                          content={part.text}
                          className="prose-sm text-sm"
                        />
                      )
                    }

                    if (part.type === 'reasoning') {
                      return (
                        <details key={`${message.id}-reasoning-${index}`} className="rounded-md border bg-muted/40 p-3 text-sm">
                          <summary className="flex cursor-pointer items-center gap-2 text-muted-foreground">
                            <Sparkles className="size-4" />
                            推理过程
                          </summary>
                          <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{part.text}</p>
                        </details>
                      )
                    }

                    if (isToolPart(part)) {
                      return <ToolCallView key={`${message.id}-tool-${index}`} part={part} />
                    }

                    return null
                  })}
                </div>
              </div>
            </div>
          ))}

          {(status === 'submitted' || status === 'streaming') && <TypingIndicator />}

          {errorMessage && (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm">
              <span className="text-destructive">{errorMessage}</span>
              {canRetry && (
                <Button type="button" variant="ghost" size="sm" onClick={() => void onRetry()}>
                  <RotateCcw className="mr-1 size-4" />
                  重试
                </Button>
              )}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
}
