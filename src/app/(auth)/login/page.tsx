import { LoginForm } from '@/features/auth/components/LoginForm'
import Link from 'next/link'
import { Note } from '@/components/ui'

export default function LoginPage() {
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-ink p-10 text-background md:flex">
        <Link href="/" className="text-xl font-extrabold tracking-tight">
          MoneyApp
        </Link>
        <div className="space-y-5">
          <Note points={50} serial="0050 0001" rank="Điểm khởi đầu" />
          <p className="max-w-sm text-sm text-background/70">
            Ví của bạn, có điểm thưởng. Ghi chi tiêu, giữ streak và đổi quà.
          </p>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-background/50">
          Polymer Ledger
        </p>
      </aside>

      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <Link href="/" className="text-xl font-extrabold tracking-tight text-primary md:hidden">
            MoneyApp
          </Link>
          <div>
            <p className="text-micro font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Chào mừng trở lại
            </p>
            <h1 className="mt-1 text-h1 font-extrabold tracking-tight">Đăng nhập</h1>
          </div>
          <LoginForm />
          <p className="text-sm text-muted-foreground">
            Chưa có tài khoản?{' '}
            <Link href="/register" className="font-semibold text-primary hover:underline">
              Đăng ký
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
