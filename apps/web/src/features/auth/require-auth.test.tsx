import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { RequireAuth } from '@/features/auth/require-auth'
import { useAuthStore } from '@/lib/auth-store'

function renderRequireAuth(initialEntries: Array<string | { pathname: string; state?: unknown }> = ['/admin']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route
          path="/admin"
          element={(
            <RequireAuth>
              <div>protected-content</div>
            </RequireAuth>
          )}
        />
        <Route path="/login" element={<div>login-page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RequireAuth', () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: null,
      user: null,
      status: 'unauthenticated',
    })
  })

  it('authenticated 时渲染受保护内容', () => {
    useAuthStore.setState({
      token: 'test-token',
      status: 'authenticated',
      user: {
        id: 1,
        username: 'admin',
        role: 'admin',
        credits: 10,
        avatarUrl: null,
        status: 'active',
      },
    })

    renderRequireAuth()

    expect(screen.getByText('protected-content')).toBeInTheDocument()
  })

  it('idle 或 loading 时显示校验中的全屏 loading', () => {
    useAuthStore.setState({
      token: 'test-token',
      user: null,
      status: 'idle',
    })

    renderRequireAuth()

    expect(screen.getByText('正在验证登录…')).toBeInTheDocument()
    expect(screen.queryByText('login-page')).not.toBeInTheDocument()
  })

  it('unauthenticated 时跳转 login，并保留来源路由', () => {
    renderRequireAuth([{ pathname: '/admin', state: { from: '/posts/test-post' } }])

    expect(screen.getByText('login-page')).toBeInTheDocument()
  })

  it('error 时展示重试入口，点击后回到 idle', () => {
    useAuthStore.setState({
      token: 'test-token',
      user: null,
      status: 'error',
    })

    renderRequireAuth()

    expect(screen.getByText('登录状态校验失败，请重试')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '重试' }))

    expect(useAuthStore.getState().status).toBe('idle')
  })
})
