import { StrictMode } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

import { AuthProvider, useAuth } from '@/features/auth/use-auth'
import { useAuthStore } from '@/lib/auth-store'

function AuthProbe() {
  const { status, user } = useAuth()

  return (
    <div>
      <div data-testid="auth-status">{status}</div>
      <div data-testid="auth-user">{user?.username ?? 'anonymous'}</div>
    </div>
  )
}

describe('AuthProvider', () => {
  it('在 StrictMode 刷新场景下能完成 token 校验，不会卡在 loading', async () => {
    sessionStorage.setItem('agentblog_token', 'test-token')
    useAuthStore.setState({
      token: 'test-token',
      user: null,
      status: 'idle',
    })

    render(
      <StrictMode>
        <AuthProvider>
          <AuthProbe />
        </AuthProvider>
      </StrictMode>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated')
      expect(screen.getByTestId('auth-user')).toHaveTextContent('admin')
    })
  })
})
