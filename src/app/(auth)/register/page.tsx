import { RegisterForm } from '@/features/auth/components/RegisterForm'
import Link from 'next/link'
import { Note } from '@/components/ui'

export default function RegisterPage() {
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-ink p-10 text-background md:flex">
        <Link href="/" className="text-xl font-extrabold tracking-tight">
          MoneyApp
        </Link>
        <div className="space-y-5">
          <Note points={50} serial="0050 0001" rank="Điểm khởi đầu" />
          <p className="max-w-sm text-sm text-background/70">
            Bắt đầu với 50 điểm. Ghi chi tiêu, giữ streak và đổi quà cùng bạn bè.
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
              Bắt đầu miễn phí
            </p>
            <h1 className="mt-1 text-h1 font-extrabold tracking-tight">Tạo tài khoản</h1>
          </div>
          <RegisterForm />
          <p className="text-sm text-muted-foreground">
            Đã có tài khoản?{' '}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Đăng nhập
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
