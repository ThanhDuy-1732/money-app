import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { listMyOrders, getOrderCode } from '@/features/shop/actions/shop.actions'
import { RevealCodeButton } from './RevealCodeButton'
import {
  Amount,
  Badge,
  Card,
  CardBody,
  EmptyState,
  PageHeader,
} from '@/components/ui'

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

  let newCode: string | null = null
  if (newOrderId) {
    const { code } = await getOrderCode(newOrderId)
    newCode = code
  }

  return (
    <main className="mx-auto max-w-narrow space-y-6 px-4 py-6">
      <PageHeader
        title="Đơn hàng của tôi"
        description="Voucher và lịch sử mua hàng."
        backHref="/shop"
      />

      {newCode && (
        <Card tone="coin">
          <CardBody className="space-y-2 pt-4">
            <Badge variant="leaf">Mua thành công</Badge>
            <p className="text-sm text-muted-foreground">Mã voucher của bạn</p>
            <code className="block break-all rounded-md border border-border bg-card px-3 py-2 font-mono text-base font-bold tracking-widest">
              {newCode}
            </code>
          </CardBody>
        </Card>
      )}

      {orders.length === 0 ? (
        <EmptyState
          title="Chưa có đơn hàng"
          description="Đơn hàng của bạn sẽ xuất hiện ở đây."
        />
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <Card key={order.id}>
              <CardBody className="space-y-2 pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{order.shop_products?.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.shop_products?.shop_partners?.name}
                    </p>
                  </div>
                  <Badge variant={order.status === 'fulfilled' ? 'leaf' : 'lotus'}>
                    {order.status === 'fulfilled' ? 'Thành công' : 'Thất bại'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  {order.payment_method === 'points' ? (
                    <Amount value={order.amount_points ?? 0} kind="points" />
                  ) : (
                    <Amount value={Number(order.amount_vnd)} kind="vnd" />
                  )}
                  <span>{new Date(order.created_at).toLocaleString('vi-VN')}</span>
                </div>

                {order.status === 'fulfilled' && order.id !== newOrderId && (
                  <RevealCodeButton orderId={order.id} />
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </main>
  )
}
