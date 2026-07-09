import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function ForbiddenPage() {
  return (
    <main className="page-shell flex min-h-[70vh] items-center justify-center">
      <div className="page-hero flex w-full max-w-xl flex-col items-center gap-4 text-center">
        <span className="eyebrow">403</span>
        <h1 className="text-6xl font-black text-foreground">无权访问此页面</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          当前账号没有足够权限访问这里。返回后台首页，或者使用更高权限账号重新登录。
        </p>
        <Button variant="outline" asChild>
          <Link to="/admin">返回后台</Link>
        </Button>
      </div>
    </main>
  )
}
