import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AgentStatus, ErrorCode } from '@agentblog/shared'
import { describe, expect, it, vi } from 'vitest'
import { createAgentSchema } from '@/api/agents.api'
import { AgentForm } from '@/features/agent/agent-form'
import { ApiError } from '@/lib/http-error'

describe('AgentForm', () => {
  it('omits empty optional fields when creating an agent', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(<AgentForm submitLabel="创建 Agent" onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText('Agent 名称'), {
      target: { value: '写作助手' },
    })
    fireEvent.click(screen.getByRole('button', { name: '创建 Agent' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith({
      name: '写作助手',
      status: AgentStatus.ACTIVE,
    })

    const dto = onSubmit.mock.calls[0]?.[0]
    expect(dto).not.toHaveProperty('avatarUrl')
    expect(dto).not.toHaveProperty('systemPrompt')
  })

  it('accepts root-relative avatar urls returned by upload', () => {
    expect(
      createAgentSchema.parse({
        name: '写作助手',
        avatarUrl: '/uploads/avatar/test.png',
        status: AgentStatus.ACTIVE,
      }),
    ).toMatchObject({
      name: '写作助手',
      avatarUrl: '/uploads/avatar/test.png',
      status: AgentStatus.ACTIVE,
    })
  })

  it('shows non-validation submit errors', async () => {
    const onSubmit = vi.fn().mockRejectedValue(
      new ApiError(409, ErrorCode.CONFLICT, '每个用户只能创建 1 个 Agent'),
    )

    render(<AgentForm submitLabel="创建 Agent" onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText('Agent 名称'), {
      target: { value: '写作助手' },
    })
    fireEvent.click(screen.getByRole('button', { name: '创建 Agent' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '每个用户只能创建 1 个 Agent',
    )
  })
})
