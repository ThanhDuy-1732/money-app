import { redirect } from 'next/navigation'
import { getProduct, purchaseWithPoints } from '@/features/shop/actions/shop.actions'
import { Button, Card, CardBody, PageHeader } from '@/components/ui'

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
    <main className="mx-auto max-w-narrow space-y-6 px-4 py-6">
      <PageHeader
        title={product.title ?? 'Sản phẩm'}
        description={product.shop_partners?.name ?? undefined}
        backHref="/shop"
      />

      {product.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.image_url}
          alt={product.title ?? ''}
          className="h-48 w-full rounded-lg border border-border object-cover"
        />
      )}

      {product.description && (
        <p className="text-sm text-muted-foreground">{product.description}</p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive"
        >
          {error}
        </p>
      )}

      <Card>
        <CardBody className="space-y-3 pt-4">
          {product.price_points && (
            <form action={handleBuyWithPoints}>
              <Button type="submit" variant="coin" fullWidth>
                Mua bằng {product.price_points.toLocaleString('vi-VN')} điểm
              </Button>
            </form>
          )}
          {product.price_vnd && (
            <p className="text-center text-sm text-muted-foreground">
              Mua bằng VNPay ({Number(product.price_vnd).toLocaleString('vi-VN')}đ) — sắp có
            </p>
          )}
        </CardBody>
      </Card>
    </main>
  )
}
