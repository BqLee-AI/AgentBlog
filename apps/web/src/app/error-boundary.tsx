import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled React error', error, errorInfo)
  }

  override render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
          <section className="max-w-md rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
            <h1 className="text-lg font-semibold">页面加载失败</h1>
            <p className="mt-2 text-sm text-muted-foreground">请刷新页面后重试。</p>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}
