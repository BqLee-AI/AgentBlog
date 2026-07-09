import { describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { useAuthStore } from '@/lib/auth-store'
import { RequireRole } from '@/features/auth/require-role'

function renderRequireRole() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route
          path="/"
          element={(
            <RequireRole roles={['admin', 'super_admin']}>
              <div>admin-content</div>
            </RequireRole>
          )}
        />
        <Route path="/login" element={<div>login-page</div>} />
        <Route path="/forbidden" element={<div>forbidden-page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RequireRole', () => {
  it('角色命中时渲染子节点', () => {
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

    renderRequireRole()

    expect(screen.getByText('admin-content')).toBeInTheDocument()
  })

  it('角色不命中时跳转 forbidden', () => {
    useAuthStore.setState({
      token: 'test-token',
      status: 'authenticated',
      user: {
        id: 2,
        username: 'user',
        role: 'user',
        credits: 10,
        avatarUrl: null,
        status: 'active',
      },
    })

    renderRequireRole()

    expect(screen.getByText('forbidden-page')).toBeInTheDocument()
    expect(screen.queryByText('admin-content')).not.toBeInTheDocument()
  })

  it('缺少 user 时跳转 login', () => {
    useAuthStore.setState({
      token: null,
      status: 'unauthenticated',
      user: null,
    })

    renderRequireRole()

    expect(screen.getByText('login-page')).toBeInTheDocument()
  })
})
