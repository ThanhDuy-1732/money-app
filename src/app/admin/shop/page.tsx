import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  listPartners,
  listProducts,
  listOrders,
  upsertPartner,
  upsertProduct,
  bulkImportCodes,
} from '@/features/admin/actions/shop.actions'
import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  Field,
  Input,
  Section,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Textarea,
} from '@/components/ui'
import { cn } from '@/lib/cn'

const TABS = [
  { value: 'partners', label: 'Đối tác' },
  { value: 'products', label: 'Sản phẩm' },
  { value: 'codes', label: 'Mã code' },
  { value: 'orders', label: 'Đơn hàng' },
]

const PAYMENT_METHODS: Record<string, string> = {
  points: 'Điểm',
  vnpay: 'VNPay',
}

const ORDER_STATUS: Record<string, { label: string; variant: 'leaf' | 'lotus' | 'neutral' }> = {
  fulfilled: { label: 'Thành công', variant: 'leaf' },
  failed: { label: 'Thất bại', variant: 'lotus' },
}

export default async function AdminShopPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; err?: string; tab?: string }>
}) {
  const [partners, products, orders, params] = await Promise.all([
    listPartners(),
    listProducts(),
    listOrders(),
    searchParams,
  ])

  const tab = TABS.find(item => item.value === params.tab)?.value ?? 'partners'

  async function handleUpsertPartner(formData: FormData) {
    'use server'
    const name = (formData.get('name') as string)?.trim()
    const logo_url = (formData.get('logo_url') as string)?.trim() ?? ''
    const active = formData.get('active') === 'on'
    const { error } = await upsertPartner({ name, logo_url, active })
    redirect(
      error
        ? `/admin/shop?tab=partners&err=${encodeURIComponent(error)}`
        : '/admin/shop?tab=partners&msg=Đã lưu đối tác'
    )
  }

  async function handleUpsertProduct(formData: FormData) {
    'use server'
    const partner_id = formData.get('partner_id') as string
    const title = (formData.get('title') as string)?.trim()
    const description = (formData.get('description') as string)?.trim() ?? ''
    const image_url = (formData.get('image_url') as string)?.trim() ?? ''
    const pp = formData.get('price_points') as string
    const pv = formData.get('price_vnd') as string
    const price_points = pp ? parseInt(pp) : null
    const price_vnd = pv ? parseInt(pv) : null
    const active = formData.get('active') === 'on'
    const { error } = await upsertProduct({
      partner_id,
      title,
      description,
      image_url,
      price_points,
      price_vnd,
      active,
    })
    redirect(
      error
        ? `/admin/shop?tab=products&err=${encodeURIComponent(error)}`
        : '/admin/shop?tab=products&msg=Đã lưu sản phẩm'
    )
  }

  async function handleBulkImport(formData: FormData) {
    'use server'
    const productId = formData.get('product_id') as string
    const codesText = formData.get('codes') as string
    const { imported, error } = await bulkImportCodes(productId, codesText)
    redirect(
      error
        ? `/admin/shop?tab=codes&err=${encodeURIComponent(error)}`
        : `/admin/shop?tab=codes&msg=${encodeURIComponent(`${imported} mã đã nhập`)}`
    )
  }

  return (
    <div data-testid="admin-shop" className="space-y-6">
      {params.msg && (
        <p className="rounded-md border border-primary/20 bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground">
          {decodeURIComponent(params.msg)}
        </p>
      )}
      {params.err && (
        <p
          role="alert"
          className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive"
        >
          {decodeURIComponent(params.err)}
        </p>
      )}

      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map(item => (
          <Link
            key={item.value}
            href={`/admin/shop?tab=${item.value}`}
            className={cn(
              '-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-semibold',
              tab === item.value
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {tab === 'partners' && (
        <Section title={`Đối tác (${partners.length})`}>
          <div className="space-y-4">
            {partners.length === 0 ? (
              <EmptyState
                title="Chưa có đối tác"
                description="Thêm đối tác đầu tiên để bắt đầu bán hàng."
              />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Tên</TH>
                    <TH>Logo</TH>
                    <TH>Trạng thái</TH>
                  </TR>
                </THead>
                <TBody>
                  {partners.map(partner => (
                    <TR key={partner.id}>
                      <TD className="font-medium">{partner.name}</TD>
                      <TD className="max-w-[240px] truncate text-muted-foreground">
                        {partner.logo_url ?? '—'}
                      </TD>
                      <TD>
                        <Badge variant={partner.active ? 'leaf' : 'neutral'}>
                          {partner.active ? 'Hoạt động' : 'Tắt'}
                        </Badge>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}

            <Card>
              <CardBody className="pt-4">
                <form
                  action={handleUpsertPartner}
                  className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
                >
                  <Field label="Tên đối tác" htmlFor="partner-name">
                    <Input id="partner-name" name="name" required placeholder="Tên đối tác" />
                  </Field>
                  <Field label="Logo URL" htmlFor="partner-logo">
                    <Input id="partner-logo" name="logo_url" placeholder="https://..." />
                  </Field>
                  <div className="flex items-center gap-3 pb-1">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="active"
                        defaultChecked
                        className="h-4 w-4 accent-[var(--color-primary)]"
                      />
                      Hoạt động
                    </label>
                    <Button type="submit">Thêm đối tác</Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          </div>
        </Section>
      )}

      {tab === 'products' && (
        <Section title={`Sản phẩm (${products.length})`}>
          <div className="space-y-4">
            {products.length === 0 ? (
              <EmptyState
                title="Chưa có sản phẩm"
                description="Thêm sản phẩm đầu tiên cho cửa hàng."
              />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Sản phẩm</TH>
                    <TH>Đối tác</TH>
                    <TH className="text-right">Điểm</TH>
                    <TH className="text-right">VNĐ</TH>
                    <TH>Trạng thái</TH>
                  </TR>
                </THead>
                <TBody>
                  {products.map(product => (
                    <TR key={product.id}>
                      <TD className="font-medium">{product.title}</TD>
                      <TD className="text-muted-foreground">{product.partner_name}</TD>
                      <TD className="text-right tabular">
                        {product.price_points?.toLocaleString('vi-VN') ?? '—'}
                      </TD>
                      <TD className="text-right tabular">
                        {product.price_vnd?.toLocaleString('vi-VN') ?? '—'}
                      </TD>
                      <TD>
                        <Badge variant={product.active ? 'leaf' : 'neutral'}>
                          {product.active ? 'Đang bán' : 'Tắt'}
                        </Badge>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}

            <Card>
              <CardBody className="pt-4">
                <form action={handleUpsertProduct} className="grid gap-3 sm:grid-cols-2">
                  <Field label="Đối tác" htmlFor="product-partner">
                    <Select id="product-partner" name="partner_id" required defaultValue="">
                      <option value="">Chọn đối tác</option>
                      {partners.map(partner => (
                        <option key={partner.id} value={partner.id}>
                          {partner.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Tên sản phẩm" htmlFor="product-title">
                    <Input id="product-title" name="title" required placeholder="Tên sản phẩm" />
                  </Field>
                  <Field label="Ảnh (URL)" htmlFor="product-image">
                    <Input id="product-image" name="image_url" placeholder="https://..." />
                  </Field>
                  <Field label="Mô tả" htmlFor="product-description">
                    <Textarea
                      id="product-description"
                      name="description"
                      rows={2}
                      placeholder="Mô tả ngắn"
                    />
                  </Field>
                  <Field label="Giá điểm" htmlFor="product-points">
                    <Input
                      id="product-points"
                      name="price_points"
                      type="number"
                      min="1"
                      placeholder="200"
                    />
                  </Field>
                  <Field label="Giá VNĐ" htmlFor="product-vnd">
                    <Input
                      id="product-vnd"
                      name="price_vnd"
                      type="number"
                      min="1"
                      placeholder="19000"
                    />
                  </Field>
                  <div className="flex items-center gap-3 sm:col-span-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="active"
                        defaultChecked
                        className="h-4 w-4 accent-[var(--color-primary)]"
                      />
                      Đang bán
                    </label>
                    <Button type="submit">Thêm sản phẩm</Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          </div>
        </Section>
      )}

      {tab === 'codes' && (
        <Section title="Nhập mã code">
          <Card>
            <CardBody className="pt-4">
              <form action={handleBulkImport} className="space-y-3">
                <Field label="Sản phẩm" htmlFor="codes-product">
                  <Select id="codes-product" name="product_id" required defaultValue="">
                    <option value="">Chọn sản phẩm</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.partner_name} — {product.title}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Danh sách mã" htmlFor="codes-text" hint="Mỗi dòng một mã.">
                  <Textarea
                    id="codes-text"
                    name="codes"
                    rows={6}
                    required
                    placeholder={'MÃ-001\nMÃ-002'}
                    className="font-mono"
                  />
                </Field>
                <Button type="submit">Nhập mã</Button>
              </form>
            </CardBody>
          </Card>
        </Section>
      )}

      {tab === 'orders' && (
        <Section title={`Đơn hàng gần đây (${orders.length})`}>
          {orders.length === 0 ? (
            <EmptyState title="Chưa có đơn hàng" description="Đơn hàng sẽ xuất hiện ở đây." />
          ) : (
            <Table className="min-w-[720px]">
              <THead>
                <TR>
                  <TH>Sản phẩm</TH>
                  <TH>Người mua</TH>
                  <TH>Thanh toán</TH>
                  <TH className="text-right">Số tiền</TH>
                  <TH>Trạng thái</TH>
                  <TH>Ngày</TH>
                </TR>
              </THead>
              <TBody>
                {orders.map(order => {
                  const status = ORDER_STATUS[order.status] ?? {
                    label: order.status,
                    variant: 'neutral' as const,
                  }
                  return (
                    <TR key={order.id}>
                      <TD className="font-medium">{order.product_title}</TD>
                      <TD className="text-muted-foreground">{order.buyer_name}</TD>
                      <TD>{PAYMENT_METHODS[order.payment_method] ?? order.payment_method}</TD>
                      <TD className="text-right tabular">
                        {order.amount_points
                          ? `${order.amount_points.toLocaleString('vi-VN')} điểm`
                          : order.amount_vnd
                            ? `${order.amount_vnd.toLocaleString('vi-VN')}đ`
                            : '—'}
                      </TD>
                      <TD>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TD>
                      <TD className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString('vi-VN')}
                      </TD>
                    </TR>
                  )
                })}
              </TBody>
            </Table>
          )}
        </Section>
      )}
    </div>
  )
}
