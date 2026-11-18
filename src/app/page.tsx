import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Coins, CreditCard, Flame, Gift, Sparkles, WalletCards } from 'lucide-react'
import { Button, Card, Coin, Guilloche, SecurityThread, WatermarkCoin } from '@/components/ui'

const FEATURES = [
  {
    icon: WalletCards,
    title: 'Ghi chi tiêu, đặt ngân sách',
    desc: 'Theo dõi thu chi theo tháng, đặt hạn mức cho từng khoản và mục tiêu tiết kiệm.',
  },
  {
    icon: Coins,
    title: 'Đăng bài, nhận điểm',
    desc: 'Mỗi bài bạn chia sẻ được +10 điểm, tối đa 3 bài mỗi ngày.',
  },
  {
    icon: Flame,
    title: 'Điểm danh mỗi ngày',
    desc: 'Giữ chuỗi ngày liên tiếp để nhận thêm điểm và phần thưởng mốc.',
  },
  {
    icon: CreditCard,
    title: 'Nạp điểm bằng VNPay',
    desc: '1.000đ được 1 điểm. Dùng để đổi quà hoặc nâng cấp Premium.',
  },
  {
    icon: Gift,
    title: 'Mời bạn, cùng nhận thưởng',
    desc: 'Bạn bè đăng ký bằng mã của bạn, cả hai đều được cộng điểm.',
  },
  {
    icon: Sparkles,
    title: 'Premium mở khóa giới hạn',
    desc: 'Bỏ giới hạn ngân sách, mục tiêu, ghi chú và việc cần làm.',
  },
]

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/feed')

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-wide items-center justify-between px-6 py-5">
        <Link href="/" className="text-xl font-extrabold tracking-tight text-primary">
          MoneyApp
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            Đăng nhập
          </Link>
          <Button asChild size="sm">
            <Link href="/register">Đăng ký</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto grid max-w-wide items-center gap-10 px-6 pb-20 pt-10 md:grid-cols-[1.15fr_1fr] md:pt-20">
        <div className="space-y-6">
          <p className="text-micro font-bold uppercase tracking-[0.18em] text-primary">
            Ví cá nhân · điểm thưởng
          </p>
          <h1 className="text-[40px] font-extrabold leading-[1.05] tracking-tight md:text-display">
            Quản lý tiền của bạn, và được thưởng vì làm điều đó.
          </h1>
          <p className="max-w-[46ch] text-body text-muted-foreground">
            Ghi chi tiêu, đặt mục tiêu tiết kiệm và chia sẻ cùng bạn bè. Mỗi hoạt động đều tích điểm để đổi quà.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild size="lg">
              <Link href="/register">Nhận 50 điểm khi đăng ký</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/explore">Xem bài đăng</Link>
            </Button>
          </div>
        </div>

        <div className="flex justify-center md:justify-end">
          <div
            data-testid="landing-note"
            className="relative isolate w-full max-w-sm overflow-hidden rounded-[28px] border border-primary/20 bg-secondary p-6 text-secondary-foreground shadow-sheet"
          >
            <Guilloche className="text-primary" opacity={0.08} />
            <SecurityThread className="absolute left-[62%] top-0 h-full -rotate-6" />
            <WatermarkCoin className="-bottom-14 -right-4" size={220} opacity={0.08} />

            <div className="relative z-10 flex items-start justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary">
                  Điểm khởi đầu
                </p>
                <p className="mt-1 font-mono text-[10px] tracking-[0.08em] text-primary">
                  SERI 0050 0001
                </p>
              </div>
              <Coin size={36} flip />
            </div>

            <p className="relative z-10 mt-8 text-[84px] font-extrabold leading-none tracking-[-0.06em] text-primary">
              50
              <span className="ml-2 text-xl font-bold tracking-normal text-primary">điểm</span>
            </p>
            <p className="relative z-10 mt-2 text-sm font-semibold text-primary">
              Khi bạn hoàn tất đăng ký.
            </p>

            <div className="relative z-10 mt-8 flex items-end justify-between">
              <span className="rounded-full border border-primary/20 bg-card/50 px-2 py-1 text-[10px] font-bold text-primary">
                MoneyApp
              </span>
              <span className="font-mono text-[10px] tracking-[0.08em] text-primary">
                POLYMER · VND
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-card py-16">
        <div className="mx-auto max-w-wide px-6">
          <h2 className="text-h2 font-bold tracking-tight">Bạn làm được gì với MoneyApp</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(feature => {
              const Icon = feature.icon
              return (
                <Card key={feature.title} className="p-5">
                  <Icon className="h-5 w-5 text-primary" />
                  <h3 className="mt-3 font-semibold">{feature.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{feature.desc}</p>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      <section className="bg-inverse py-16 text-center text-inverse-foreground">
        <div className="mx-auto max-w-xl space-y-5 px-6">
          <h2 className="text-h1 font-extrabold tracking-tight">Bắt đầu với 50 điểm</h2>
          <p className="text-inverse-foreground/70">Đăng ký miễn phí, không cần thẻ.</p>
          <Button asChild variant="coin" size="lg">
            <Link href="/register">Tạo tài khoản</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
