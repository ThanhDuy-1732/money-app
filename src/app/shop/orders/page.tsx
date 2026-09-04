import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { listMyOrders, getOrderCode } from '@/features/shop/actions/shop.actions'
import { RevealCodeButton } from './RevealCodeButton'

export default async function ShopOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { new: newOrderId } = await searchParams
  const orders = await listMyOrders()

  // Pre-fetch code for the just-purchased order to show immediately
  let newCode: string | null = null
  if (newOrderId) {
    const { code } = await getOrderCode(newOrderId)
    newCode = code
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold">Đơn hàng của tôi</h1>

      {newCode && (
        <div className="border border-green-300 bg-green-50 dark:bg-green-950 rounded-xl p-4">
          <p className="text-sm font-semibold text-green-700 dark:text-green-300">
            Mua thành công! Mã voucher:
          </p>
          <p className="font-mono text-lg font-bold mt-1 tracking-widest">{newCode}</p>
        </div>
      )}

      {orders.length === 0 ? (
        <p className="text-center text-gray-400 py-8">Chưa có đơn hàng.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="border rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <p className="font-semibold text-sm">{(o.shop_products as any)?.title}</p>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <p className="text-xs text-gray-400">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {(o.shop_products as any)?.shop_partners?.name}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    o.status === 'fulfilled'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {o.status === 'fulfilled' ? 'Thành công' : 'Thất bại'}
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>
                  {o.payment_method === 'points'
                    ? `${o.amount_points?.toLocaleString()} điểm`
                    : `${Number(o.amount_vnd).toLocaleString('vi-VN')}đ`}
                </span>
                <span>{new Date(o.created_at).toLocaleString('vi-VN')}</span>
              </div>
              {o.status === 'fulfilled' && o.id !== newOrderId && (
                <RevealCodeButton orderId={o.id} />
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
