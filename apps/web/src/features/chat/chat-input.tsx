import type { ChangeEvent, FormEvent, KeyboardEvent } from 'react'

import { Button } from '@/components/ui/button'

interface ChatInputProps {
  input: string
  disabled?: boolean
  isStreaming?: boolean
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
  onSubmit: (event?: FormEvent<HTMLFormElement>) => Promise<void> | void
  onStop: () => Promise<void> | void
}

export function ChatInput({
  input,
  disabled,
  isStreaming,
  onChange,
  onSubmit,
  onStop,
}: ChatInputProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void onSubmit()
    }
  }

  return (
    <div className="border-t border-foreground/10 bg-card px-4 py-4">
      <form className="space-y-3" onSubmit={(event) => void onSubmit(event)}>
        <textarea
          value={input}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          placeholder="输入消息"
          className="min-h-28 w-full resize-y rounded-lg border border-input bg-background px-3 py-3 text-sm leading-6 outline-none transition focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
        />

        <div className="flex justify-end gap-2">
          {isStreaming && (
            <Button type="button" variant="outline" className="rounded-md" onClick={() => void onStop()}>
              停止生成
            </Button>
          )}
          <Button type="submit" className="rounded-md" disabled={disabled || input.trim().length === 0}>
            {isStreaming ? '生成中…' : '发送'}
          </Button>
        </div>
      </form>
    </div>
  )
}
