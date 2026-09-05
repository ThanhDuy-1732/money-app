import Link from 'next/link'
import { listProducts } from '@/features/shop/actions/shop.actions'

export default async function ShopPage() {
  const products = await listProducts()

  return (
    <main className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Shop</h1>
        <Link href="/shop/orders" className="text-sm text-blue-600 hover:underline">
          Đơn của tôi →
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="text-center text-gray-400 py-12">Chưa có sản phẩm.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {products.map((p) => (
            <Link
              key={p.id}
              href={`/shop/${p.id}`}
              className="border rounded-xl p-4 hover:border-blue-400 transition-colors"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.image_url && (
                <img
                  src={p.image_url}
                  alt={p.title ?? ''}
                  className="w-full h-32 object-cover rounded-lg mb-3"
                />
              )}
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <p className="text-xs text-gray-400">{(p.shop_partners as any)?.name}</p>
              <p className="font-semibold mt-0.5">{p.title}</p>
              <div className="flex gap-2 mt-2 text-sm">
                {p.price_points && (
                  <span className="text-amber-600">
                    {p.price_points.toLocaleString()} điểm
                  </span>
                )}
                {p.price_vnd && (
                  <span className="text-green-700">
                    {Number(p.price_vnd).toLocaleString('vi-VN')}đ
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
