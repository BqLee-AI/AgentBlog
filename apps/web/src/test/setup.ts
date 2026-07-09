import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { authStore } from '@/lib/auth-store'
import { queryClient } from '@/lib/query-client'
import { setUnauthorizedHandler } from '@/lib/request'
import { server } from './server'

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  server.resetHandlers()
  authStore.getState().clear()
  queryClient.clear()
  sessionStorage.clear()
  setUnauthorizedHandler(() => {})
})

afterAll(() => {
  server.close()
})
