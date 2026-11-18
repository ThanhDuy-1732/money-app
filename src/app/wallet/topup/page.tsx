import { PageHeader } from '@/components/ui'
import { TopupForm } from '@/features/wallet/components/TopupForm'

export default function TopupPage() {
  return (
    <main className="mx-auto max-w-narrow space-y-6 px-4 py-6">
      <PageHeader
        title="Nạp điểm"
        description="1.000đ = 1 điểm. Điểm được cộng sau khi thanh toán thành công."
        backHref="/wallet"
      />
      <TopupForm />
    </main>
  )
}
