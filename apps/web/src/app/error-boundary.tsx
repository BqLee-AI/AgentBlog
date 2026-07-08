/**
 * ErrorBoundary —— 全局渲染错误兜底（三层防线 §一 的全局层）。
 *
 * 捕获**渲染期**异常（组件 throw、render crash），避免白屏。
 * Async 错误（onClick 内 await 的 rejection）不会被它捕获，那部分由全局 toast 兜底。
 *
 * v1：错误仅 console.error，不接 Sentry（见 issue #7 明确不做项）。
 */
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // v1 只 console；后续接错误上报（Sentry 等）在此处
    console.error('渲染错误:', error, info)
  }

  override render() {
    if (this.state.error) {
      return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <h1 className="text-2xl font-bold">页面出错了</h1>
          <p className="text-muted-foreground">抱歉，发生了一些错误，请刷新或返回首页。</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.location.reload()}>
              刷新页面
            </Button>
            <Button
              onClick={() => {
                this.setState({ error: null })
                window.location.href = '/'
              }}
            >
              返回首页
            </Button>
          </div>
        </main>
      )
    }
    return this.props.children
  }
}
