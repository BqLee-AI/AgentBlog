import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { RootProviders } from '@/app/root-providers'
import '@/index.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element #root was not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <RootProviders />
  </StrictMode>,
)
