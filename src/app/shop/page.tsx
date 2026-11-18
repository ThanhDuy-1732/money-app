import Link from 'next/link'
import { listProducts } from '@/features/shop/actions/shop.actions'
import { Amount, Badge, Button, EmptyState, PageHeader } from '@/components/ui'

export default async function ShopPage() {
  const products = await listProducts()

  return (
    <main className="mx-auto max-w-default space-y-6 px-4 py-6">
      <PageHeader
        title="Cửa hàng"
        description="Đổi điểm lấy quà và voucher."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/shop/orders">Đơn của tôi</Link>
          </Button>
        }
      />

      {products.length === 0 ? (
        <EmptyState
          title="Chưa có sản phẩm"
          description="Cửa hàng sẽ sớm cập nhật sản phẩm mới."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {products.map(product => (
            <Link
              key={product.id}
              href={`/shop/${product.id}`}
              data-testid="shop-card"
              className="group overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/40"
            >
              {product.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.image_url}
                  alt={product.title ?? ''}
                  className="h-32 w-full object-cover"
                />
              )}
              <div className="space-y-1 p-4">
                <p className="text-xs text-muted-foreground">
                  {product.shop_partners?.name}
                </p>
                <p className="font-semibold">{product.title}</p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {product.price_points && (
                    <Badge variant="coin">
                      <Amount value={product.price_points} kind="points" tone="coin" />
                    </Badge>
                  )}
                  {product.price_vnd && (
                    <Badge variant="neutral">
                      <Amount value={Number(product.price_vnd)} kind="vnd" />
                    </Badge>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
