import { createBrowserRouter } from 'react-router-dom'
import { HomePage } from '@/pages/public/home.page'
import PostListPage from '@/pages/public/post-list.page'
import PostDetailPage from '@/pages/public/post-detail.page'
import NotFoundPage from '@/pages/not-found.page'

export const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/posts', element: <PostListPage /> },
  { path: '/posts/:slug', element: <PostDetailPage /> },
  { path: '/not-found', element: <NotFoundPage /> },
  { path: '*', element: <NotFoundPage /> },
])
