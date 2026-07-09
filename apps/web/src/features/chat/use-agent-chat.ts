import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type ChatStatus, type UIMessage } from 'ai'
import type { ApiResponse } from '@agentblog/shared'
import { ErrorCode } from '@agentblog/shared'
import { useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { authApi } from '@/api/auth.api'
import { authStore } from '@/lib/auth-store'
import { ApiError } from '@/lib/http-error'
import { queryKeys } from '@/lib/query-keys'

interface ChatUiError {
  message: string
  retryable: boolean
}

async function parseChatError(response: Response): Promise<Error> {
  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    try {
      const payload = (await response.clone().json()) as ApiResponse<never>
      if (!payload.ok) {
        return new ApiError(
          response.status,
          payload.error.code,
          payload.error.message,
          payload.error.fields,
        )
      }
    } catch {
      // ignore parse failure and fall back to text body
    }
  }

  const message = (await response.text()) || '对话请求失败，请稍后重试'
  return new Error(message)
}

async function refreshCurrentUser(queryClient: ReturnType<typeof useQueryClient>) {
  const user = await authApi.me()
  authStore.getState().setUser(user)
  queryClient.setQueryData(queryKeys.me, user)
  await queryClient.invalidateQueries({ queryKey: queryKeys.me })
  return user
}

function isBusyStatus(status: ChatStatus) {
  return status === 'submitted' || status === 'streaming'
}

function getChatUiError(error: Error): ChatUiError {
  if (error instanceof ApiError) {
    if (error.code === ErrorCode.INSUFFICIENT_CREDITS) {
      return { message: '额度不足，请联系管理员充值', retryable: false }
    }

    if (error.code === ErrorCode.FORBIDDEN) {
      return { message: error.message || '当前 Agent 无法发起对话', retryable: false }
    }

    if (error.code === ErrorCode.BAD_REQUEST) {
      return { message: error.message, retryable: false }
    }

    return { message: error.message, retryable: false }
  }

  const text = error.message.toLowerCase()
  const isNetworkError = text.includes('fetch') || text.includes('network')

  return {
    message: isNetworkError ? '网络异常，请重试' : error.message || '对话出错，请重试',
    retryable: true,
  }
}

export function useAgentChat() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const [input, setInput] = useState('')
  const [uiError, setUiError] = useState<ChatUiError | null>(null)

  const chat = useChat({
    transport: new DefaultChatTransport<UIMessage>({
      api: '/api/chat',
      headers: () => {
        const token = authStore.getState().token
        return token ? { Authorization: `Bearer ${token}` } : {}
      },
      prepareSendMessagesRequest: ({ messages }) => ({
        body: { messages },
      }),
      fetch: async (request, init) => {
        const response = await fetch(request, init)
        if (!response.ok) {
          throw await parseChatError(response)
        }
        return response
      },
    }),
    onFinish: async ({ isError }) => {
      if (isError) return

      try {
        await refreshCurrentUser(queryClient)
      } catch {
        // credits 刷新失败不打断已完成的对话，也不额外弹错
      }
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        if (error.code === ErrorCode.UNAUTHORIZED) {
          authStore.getState().clear()
          queryClient.clear()
          navigate('/login', { replace: true, state: { from: location } })
          return
        }
      }

      const nextError = getChatUiError(error)
      setUiError(nextError)
      toast.error(nextError.message)
    },
  })

  function handleInputChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setUiError(null)
    if (chat.error) {
      chat.clearError()
    }
    setInput(event.target.value)
  }

  async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()

    const draft = input
    const text = draft.trim()
    if (!text || isBusyStatus(chat.status)) return

    setUiError(null)
    setInput('')
    try {
      await chat.sendMessage({ text })
    } catch {
      setInput(draft)
    }
  }

  async function retry() {
    if (!uiError?.retryable) return

    try {
      setUiError(null)
      await chat.regenerate()
    } catch {
      // onError 会统一处理
    }
  }

  async function stop() {
    await chat.stop()
  }

  return {
    messages: chat.messages,
    status: chat.status,
    errorMessage: uiError?.message ?? null,
    canRetry: uiError?.retryable ?? false,
    input,
    handleInputChange,
    handleSubmit,
    retry,
    stop,
  }
}
