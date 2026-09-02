import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/feed')

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-50">
      {/* Nav */}
      <header className="border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
        <span className="font-bold text-xl text-blue-600">MoneyApp</span>
        <div className="flex gap-3">
          <Link href="/login" className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
            Đăng nhập
          </Link>
          <Link href="/register" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            Bắt đầu miễn phí
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center space-y-6">
        <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-sm font-medium px-4 py-2 rounded-full">
          🎁 Nhận <strong>50 điểm</strong> ngay khi đăng ký — hoàn toàn miễn phí
        </div>
        <h1 className="text-5xl font-extrabold leading-tight tracking-tight">
          Chia sẻ. Kết nối.{' '}
          <span className="text-blue-600">Kiếm điểm.</span>
        </h1>
        <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
          Mạng xã hội tích điểm thưởng — đăng bài, kết bạn, hoàn thành thử thách và đổi quà hấp dẫn.
        </p>
        <div className="flex gap-4 justify-center pt-2">
          <Link href="/register" className="px-8 py-3 text-base font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 dark:shadow-none">
            Tạo tài khoản
          </Link>
          <Link href="/explore" className="px-8 py-3 text-base font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Khám phá bài đăng
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {[
            { icon: '📝', title: 'Đăng bài, kiếm điểm', desc: 'Mỗi bài đăng bạn chia sẻ mang lại +10 điểm. Càng năng động, càng nhiều thưởng.' },
            { icon: '🔥', title: 'Streak đăng nhập', desc: 'Đăng nhập mỗi ngày để duy trì streak và nhân điểm thưởng theo chuỗi ngày liên tiếp.' },
            { icon: '💰', title: 'Nạp điểm qua VNPay', desc: 'Nạp điểm nhanh chóng qua VNPay. 1.000đ = 1 điểm, dùng đổi quà tức thì.' },
            { icon: '🤝', title: 'Giới thiệu bạn bè', desc: 'Mỗi người bạn giới thiệu thành công, cả hai đều nhận thưởng điểm hấp dẫn.' },
          ].map(f => (
            <div key={f.title} className="flex gap-4 p-5 border border-gray-100 dark:border-gray-800 rounded-xl hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
              <span className="text-3xl leading-none">{f.icon}</span>
              <div>
                <h3 className="font-semibold mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA bottom */}
      <section className="border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 py-16 text-center space-y-4">
        <h2 className="text-2xl font-bold">Sẵn sàng bắt đầu?</h2>
        <p className="text-gray-500 dark:text-gray-400">Đăng ký miễn phí — nhận ngay 50 điểm chào mừng.</p>
        <Link href="/register" className="inline-block mt-2 px-8 py-3 text-base font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors">
          Đăng ký ngay →
        </Link>
      </section>
    </div>
  )
}
