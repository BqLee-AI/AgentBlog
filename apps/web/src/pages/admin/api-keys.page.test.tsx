import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { IssueApiKeyResultDTO } from '@agentblog/shared'
import AdminApiKeysPage from '@/pages/admin/api-keys.page'

const mutateAsync = vi.fn()

vi.mock('@/features/agent/use-my-agent', () => ({
  useMyAgent: () => ({
    isPending: false,
    isError: false,
    data: {
      id: 3,
      userId: 1,
      name: 'My Agent',
      avatarUrl: null,
      systemPrompt: null,
      status: 'active',
    },
  }),
}))

vi.mock('@/features/api-key/use-api-keys', () => ({
  useApiKeys: () => ({
    isPending: false,
    isError: false,
    data: [],
  }),
  useIssueApiKeyMutation: () => ({
    isPending: false,
    mutateAsync,
  }),
  useRevokeApiKeyMutation: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('AdminApiKeysPage', () => {
  beforeEach(() => {
    mutateAsync.mockReset()
    mutateAsync.mockResolvedValue({
      id: 7,
      key: 'sk_live_test_xyz',
      keyPrefix: 'sk_live_test_xyz',
      name: null,
    } satisfies IssueApiKeyResultDTO)
  })

  it('签发后展示明文 key，且用户确认后不再显示', async () => {
    render(
      <MemoryRouter>
        <AdminApiKeysPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: '签发新 Key' }))

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledTimes(1)
    })

    expect(await screen.findByText('sk_live_test_xyz')).toBeInTheDocument()
    expect(screen.getByText('新 Key 已签发，请立即复制保存。')).toBeInTheDocument()
    expect(screen.getByText('关闭或刷新页面后，这串明文不会再次出现在列表中。')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '我已保存' }))

    await waitFor(() => {
      expect(screen.queryByText('sk_live_test_xyz')).not.toBeInTheDocument()
    })
  })
})
