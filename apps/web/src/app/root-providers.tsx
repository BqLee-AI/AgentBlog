import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

import { App } from '@/App'
import { ErrorBoundary } from '@/app/error-boundary'

export function RootProviders() {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
