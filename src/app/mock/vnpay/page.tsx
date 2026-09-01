import { redirect } from 'next/navigation'

/**
 * Mock VNPay gateway — chỉ dùng khi VNPAY_TMN_CODE / VNPAY_HASH_SECRET chưa cấu hình.
 * Nhận: ?amount=<VNĐ>&txnRef=<ref>
 * Luôn redirect về /wallet/topup/return (hardcoded — không nhận returnUrl từ input)
 */

// Return path hardcoded — tránh open redirect khi nhận từ query/form input
const RETURN_PATH = '/wallet/topup/return'

interface Props {
  searchParams: Promise<{ amount?: string; txnRef?: string }>
}

async function pay(formData: FormData) {
  'use server'
  const txnRef = formData.get('txnRef') as string
  const amount = formData.get('amount') as string
  redirect(RETURN_PATH + '?' + new URLSearchParams({
    vnp_TxnRef: txnRef,
    vnp_Amount: String(Number(amount) * 100),
    vnp_ResponseCode: '00',
    vnp_TransactionStatus: '00',
  }))
}

async function cancel(formData: FormData) {
  'use server'
  const txnRef = formData.get('txnRef') as string
  redirect(RETURN_PATH + '?' + new URLSearchParams({
    vnp_TxnRef: txnRef,
    vnp_ResponseCode: '99',
    vnp_TransactionStatus: '99',
  }))
}

export default async function MockVNPayPage({ searchParams }: Props) {
  const { amount = '0', txnRef = '' } = await searchParams
  const amountNum = Number(amount)

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#005BAA]">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header giả VNPay */}
        <div className="bg-[#005BAA] px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-bold text-[#005BAA] text-sm">V</div>
          <span className="text-white font-semibold text-lg">VNPay</span>
          <span className="ml-auto text-xs text-blue-200 bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded font-medium">MOCK</span>
        </div>

        <div className="px-6 py-6 space-y-5">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Số tiền thanh toán</p>
            <p className="text-3xl font-bold text-gray-900">
              {amountNum.toLocaleString('vi-VN')}
              <span className="text-lg font-normal text-gray-500 ml-1">đ</span>
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm space-y-1">
            <div className="flex justify-between text-gray-500">
              <span>Mã giao dịch</span>
              <span className="font-mono text-gray-700 text-xs">{txnRef}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Nhận được</span>
              <span className="font-semibold text-green-600">{Math.floor(amountNum / 1000).toLocaleString('vi-VN')} điểm</span>
            </div>
          </div>

          <p className="text-xs text-center text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
            ⚠️ Đây là môi trường <strong>mock</strong> — không thực hiện thanh toán thật
          </p>

          <div className="space-y-2">
            <form action={pay}>
              <input type="hidden" name="txnRef" value={txnRef} />
              <input type="hidden" name="amount" value={amount} />
              <button type="submit"
                className="w-full bg-[#005BAA] hover:bg-[#004a8a] text-white font-semibold py-3 rounded-xl transition-colors">
                Thanh toán (Mock)
              </button>
            </form>

            <form action={cancel}>
              <input type="hidden" name="txnRef" value={txnRef} />
              <button type="submit"
                className="w-full border border-gray-300 hover:bg-gray-50 text-gray-600 font-medium py-3 rounded-xl transition-colors">
                Hủy giao dịch
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  )
}
