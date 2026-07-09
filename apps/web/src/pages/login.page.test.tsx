import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import LoginPage from '@/pages/login.page'
import { useAuthStore } from '@/lib/auth-store'

function CreditsPage() {
  const location = useLocation()
  const state = location.state as { targetUser?: { username: string } } | null

  return (
    <div>
      <div>credits-page</div>
      <div>{location.search || 'no-search'}</div>
      <div>{location.hash || 'no-hash'}</div>
      <div>{state?.targetUser?.username ?? 'no-target-user'}</div>
    </div>
  )
}

function renderLoginPage(
  initialEntry: string | { pathname: string; state?: unknown } = '/login',
) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin" element={<div>admin-page</div>} />
        <Route path="/admin/posts" element={<div>posts-page</div>} />
        <Route path="/admin/credits" element={<CreditsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: null,
      user: null,
      status: 'unauthenticated',
    })
  })

  it('仅 status === authenticated 时回跳到 from', async () => {
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

    renderLoginPage({
      pathname: '/login',
      state: { from: { pathname: '/admin/posts' } },
    })

    expect(await screen.findByText('posts-page')).toBeInTheDocument()
  })

  it('已认证访问 /login 时保留完整回跳地址与路由 state', async () => {
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

    renderLoginPage({
      pathname: '/login',
      state: {
        from: {
          pathname: '/admin/credits',
          search: '?userId=7',
          hash: '#ledger',
          state: { targetUser: { username: 'alice' } },
        },
      },
    })

    expect(await screen.findByText('credits-page')).toBeInTheDocument()
    expect(screen.getByText('?userId=7')).toBeInTheDocument()
    expect(screen.getByText('#ledger')).toBeInTheDocument()
    expect(screen.getByText('alice')).toBeInTheDocument()
  })

  it('仅有 token 但仍在校验时显示 loading，避免 /login 回跳循环', () => {
    useAuthStore.setState({
      token: 'test-token',
      user: null,
      status: 'idle',
    })

    renderLoginPage()

    expect(screen.getByText('正在验证登录…')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '登录' })).not.toBeInTheDocument()
  })

  it('登录成功后写入鉴权态并跳到默认后台页', async () => {
    renderLoginPage()

    fireEvent.change(screen.getByLabelText('用户名'), {
      target: { value: 'admin' },
    })
    fireEvent.change(screen.getByLabelText('密码'), {
      target: { value: 'secret123' },
    })
    fireEvent.click(screen.getByRole('button', { name: '登录' }))

    expect(await screen.findByText('admin-page')).toBeInTheDocument()
    expect(useAuthStore.getState().token).toBe('test-token')
  })

  it('登录成功后保留完整回跳地址与路由 state', async () => {
    renderLoginPage({
      pathname: '/login',
      state: {
        from: {
          pathname: '/admin/credits',
          search: '?userId=9',
          hash: '#recharge',
          state: { targetUser: { username: 'bob' } },
        },
      },
    })

    fireEvent.change(screen.getByLabelText('用户名'), {
      target: { value: 'admin' },
    })
    fireEvent.change(screen.getByLabelText('密码'), {
      target: { value: 'secret123' },
    })
    fireEvent.click(screen.getByRole('button', { name: '登录' }))

    expect(await screen.findByText('credits-page')).toBeInTheDocument()
    expect(screen.getByText('?userId=9')).toBeInTheDocument()
    expect(screen.getByText('#recharge')).toBeInTheDocument()
    expect(screen.getByText('bob')).toBeInTheDocument()
  })

  it('服务端字段校验错误只回填表单，不显示顶部全局错误', async () => {
    renderLoginPage()

    fireEvent.change(screen.getByLabelText('用户名'), {
      target: { value: 'field-error' },
    })
    fireEvent.change(screen.getByLabelText('密码'), {
      target: { value: 'secret123' },
    })
    fireEvent.click(screen.getByRole('button', { name: '登录' }))

    expect(await screen.findByText('用户名已存在')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByText('参数校验失败')).not.toBeInTheDocument()
    })
  })
})
