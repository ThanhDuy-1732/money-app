import { redirect } from 'next/navigation'
import { getProduct, purchaseWithPoints } from '@/features/shop/actions/shop.actions'

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await params
  const { error } = await searchParams
  const product = await getProduct(id)
  if (!product) redirect('/shop')

  async function handleBuyWithPoints() {
    'use server'
    const { orderId, error: err } = await purchaseWithPoints(id)
    if (err) redirect(`/shop/${id}?error=${encodeURIComponent(err)}`)
    redirect(`/shop/orders?new=${orderId}`)
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {product.image_url && (
        <img
          src={product.image_url}
          alt={product.title ?? ''}
          className="w-full h-48 object-cover rounded-xl"
        />
      )}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <p className="text-sm text-gray-400">{(product.shop_partners as any)?.name}</p>
      <h1 className="text-2xl font-bold">{product.title}</h1>
      {product.description && (
        <p className="text-sm text-gray-600">{product.description}</p>
      )}

      {error && (
        <div className="border border-red-200 bg-red-50 dark:bg-red-950 rounded-xl p-3">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="border rounded-xl p-4 space-y-3">
        {product.price_points && (
          <form action={handleBuyWithPoints}>
            <button className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
              Mua bằng {product.price_points.toLocaleString()} điểm
            </button>
          </form>
        )}
        {product.price_vnd && (
          <p className="text-center text-sm text-gray-500">
            Mua bằng VNPay ({Number(product.price_vnd).toLocaleString('vi-VN')}đ) — sắp có
          </p>
        )}
      </div>
    </main>
  )
}
