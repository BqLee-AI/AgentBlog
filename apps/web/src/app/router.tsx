/**
 * 路由树（createBrowserRouter）。
 *
 * 三域分区（详见 docs/design/frontend/02 §一）：
 *   - 公开阅读端：/ /posts /posts/:slug /login /forbidden（无鉴权）
 *   - 在线对话：/chat（RequireAuth）
 *   - 写作后台：/admin/*（RequireAuth，子路由部分 RequireRole）
 *
 * 所有页面 lazy + 动态 import → 路由级代码分割。
 * 全局 Suspense 兜底在 RootProviders（PageSkeleton）。
 */
import { lazy } from 'react'
import { createBrowserRouter, Outlet } from 'react-router-dom'
import { SiteHeader } from '@/components/layout/site-header'
import { RequireAuth } from '@/features/auth/require-auth'
import { RequireRole } from '@/features/auth/require-role'
import type { Role } from '@agentblog/shared'

// ── 路由级懒加载（每页独立 chunk）──
const lazyPage = <T extends { default: React.ComponentType }>(loader: () => Promise<T>) =>
  lazy(loader)

const Home = lazyPage(() => import('@/pages/public/home.page'))
const PostList = lazyPage(() => import('@/pages/public/post-list.page'))
const PostDetail = lazyPage(() => import('@/pages/public/post-detail.page'))
const Login = lazyPage(() => import('@/pages/login.page'))
const Chat = lazyPage(() => import('@/pages/chat.page'))
const Forbidden = lazyPage(() => import('@/pages/forbidden.page'))
const NotFound = lazyPage(() => import('@/pages/not-found.page'))

const AdminLayout = lazyPage(() => import('@/pages/admin/layout.page'))
const AdminPosts = lazyPage(() => import('@/pages/admin/posts.page'))
const PostEdit = lazyPage(() => import('@/pages/admin/post-edit.page'))
const AdminTags = lazyPage(() => import('@/pages/admin/tags.page'))
const AdminUsers = lazyPage(() => import('@/pages/admin/users.page'))
const AdminCredits = lazyPage(() => import('@/pages/admin/credits.page'))
const AdminAgent = lazyPage(() => import('@/pages/admin/agent.page'))
const AdminApiKeys = lazyPage(() => import('@/pages/admin/api-keys.page'))

// admin+ 角色白名单复用
const ADMIN_PLUS: Role[] = ['admin', 'super_admin']

export const router = createBrowserRouter([
  {
    path: '/',
    // 公开域：SiteHeader + Outlet（admin 有自己的 layout，不在其下）
    element: (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    ),
    children: [
      { index: true, element: <Home /> },
      { path: 'posts', element: <PostList /> },
      { path: 'posts/:slug', element: <PostDetail /> },
      { path: 'login', element: <Login /> },
      { path: 'forbidden', element: <Forbidden /> },

      // 受保护：对话
      {
        path: 'chat',
        element: (
          <RequireAuth>
            <Chat />
          </RequireAuth>
        ),
      },

      // 受保护：写作后台（独立 layout，不挂 SiteHeader）
      {
        path: 'admin',
        element: (
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        ),
        children: [
          { index: true, element: <AdminPosts /> },
          { path: 'posts', element: <AdminPosts /> },
          { path: 'posts/new', element: <PostEdit /> },
          { path: 'posts/:id/edit', element: <PostEdit /> },
          {
            path: 'tags',
            element: (
              <RequireRole roles={ADMIN_PLUS}>
                <AdminTags />
              </RequireRole>
            ),
          },
          {
            path: 'users',
            element: (
              <RequireRole roles={ADMIN_PLUS}>
                <AdminUsers />
              </RequireRole>
            ),
          },
          { path: 'credits', element: <AdminCredits /> },
          { path: 'agent', element: <AdminAgent /> },
          { path: 'agent/keys', element: <AdminApiKeys /> },
        ],
      },

      { path: '*', element: <NotFound /> },
    ],
  },
])
