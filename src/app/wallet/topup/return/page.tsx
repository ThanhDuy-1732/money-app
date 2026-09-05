import { verifyVNPayReturn } from '@/features/wallet/actions/topup.actions'
import Link from 'next/link'
import { Button } from '@/components/ui'

interface Props {
  searchParams: Promise<Record<string, string>>
}

export default async function TopupReturnPage({ searchParams }: Props) {
  const params = await searchParams
  const { success, amount, mock } = await verifyVNPayReturn(params)

  return (
    <main className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
      {success ? (
        <>
          <div className="text-5xl">🎉</div>
          <h1 className="text-2xl font-bold">Thanh toán thành công!</h1>
          {amount && (
            <p className="text-muted-foreground">
              Bạn đã nạp{' '}
              <span className="font-semibold text-foreground">
                {amount.toLocaleString('vi-VN')}đ
              </span>{' '}
              {mock ? '— điểm mock, chưa kết nối DB.' : '— điểm sẽ được cộng trong vài giây.'}
            </p>
          )}
          {mock && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 inline-block">
              ⚠️ Mock mode — set VNPAY_TMN_CODE + VNPAY_HASH_SECRET để dùng thật
            </p>
          )}
        </>
      ) : (
        <>
          <div className="text-5xl">❌</div>
          <h1 className="text-2xl font-bold">Thanh toán thất bại</h1>
          <p className="text-muted-foreground">Giao dịch bị hủy hoặc không hợp lệ. Vui lòng thử lại.</p>
        </>
      )}

      <div className="flex gap-3 justify-center pt-4">
        <Button asChild variant="outline">
          <Link href="/wallet/topup">Nạp lại</Link>
        </Button>
        <Button asChild>
          <Link href="/wallet">Về ví</Link>
        </Button>
      </div>
    </main>
  )
}
