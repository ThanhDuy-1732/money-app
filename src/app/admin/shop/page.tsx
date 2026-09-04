import { listPartners, listProducts, listOrders, upsertPartner, upsertProduct, bulkImportCodes } from '@/features/admin/actions/shop.actions'
import { redirect } from 'next/navigation'

export default async function AdminShopPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; err?: string }>
}) {
  const [partners, products, orders, params] = await Promise.all([
    listPartners(),
    listProducts(),
    listOrders(),
    searchParams,
  ])

  async function handleUpsertPartner(formData: FormData) {
    'use server'
    const name = (formData.get('name') as string)?.trim()
    const logo_url = (formData.get('logo_url') as string)?.trim() ?? ''
    const active = formData.get('active') === 'on'
    await upsertPartner({ name, logo_url, active })
    redirect('/admin/shop?msg=Partner+saved')
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
    await upsertProduct({ partner_id, title, description, image_url, price_points, price_vnd, active })
    redirect('/admin/shop?msg=Product+saved')
  }

  async function handleBulkImport(formData: FormData) {
    'use server'
    const productId = formData.get('product_id') as string
    const codesText = formData.get('codes') as string
    const { imported } = await bulkImportCodes(productId, codesText)
    redirect(`/admin/shop?msg=${imported}+codes+imported`)
  }

  return (
    <div className="space-y-8 p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold">Admin — Shop Management</h1>

      {params.msg && (
        <div className="rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm text-green-700">
          {decodeURIComponent(params.msg)}
        </div>
      )}
      {params.err && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
          {decodeURIComponent(params.err)}
        </div>
      )}

      {/* ── 1. Partners ── */}
      <section className="rounded-xl border p-4 space-y-4">
        <h2 className="font-semibold text-lg">Partners ({partners.length})</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="pb-1">Name</th>
              <th className="pb-1">Logo URL</th>
              <th className="pb-1">Active</th>
            </tr>
          </thead>
          <tbody>
            {partners.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="py-1">{p.name}</td>
                <td className="py-1 truncate max-w-[200px] text-gray-500">{p.logo_url ?? '—'}</td>
                <td className="py-1">{p.active ? '✓' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <form action={handleUpsertPartner} className="flex flex-wrap gap-2 items-end">
          <input name="name" placeholder="Name" required className="border rounded px-3 py-1.5 text-sm" />
          <input name="logo_url" placeholder="Logo URL" className="border rounded px-3 py-1.5 text-sm flex-1" />
          <label className="flex items-center gap-1 text-sm">
            <input name="active" type="checkbox" defaultChecked /> Active
          </label>
          <button className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded">Add Partner</button>
        </form>
      </section>

      {/* ── 2. Products ── */}
      <section className="rounded-xl border p-4 space-y-4">
        <h2 className="font-semibold text-lg">Products ({products.length})</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="pb-1">Title</th>
              <th className="pb-1">Partner</th>
              <th className="pb-1">Points</th>
              <th className="pb-1">VND</th>
              <th className="pb-1">Active</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="py-1">{p.title}</td>
                <td className="py-1 text-gray-500">{p.partner_name}</td>
                <td className="py-1">{p.price_points ?? '—'}</td>
                <td className="py-1">{p.price_vnd ? p.price_vnd.toLocaleString() : '—'}</td>
                <td className="py-1">{p.active ? '✓' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <form action={handleUpsertProduct} className="grid grid-cols-2 gap-2">
          <select name="partner_id" required className="border rounded px-3 py-1.5 text-sm col-span-2">
            <option value="">— Select partner —</option>
            {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input name="title" placeholder="Product title" required className="border rounded px-3 py-1.5 text-sm" />
          <input name="image_url" placeholder="Image URL" className="border rounded px-3 py-1.5 text-sm" />
          <textarea name="description" placeholder="Description" rows={2} className="border rounded px-3 py-1.5 text-sm col-span-2" />
          <input name="price_points" type="number" placeholder="Price (points)" className="border rounded px-3 py-1.5 text-sm" />
          <input name="price_vnd" type="number" placeholder="Price (VND)" className="border rounded px-3 py-1.5 text-sm" />
          <div className="col-span-2 flex items-center gap-4">
            <label className="flex items-center gap-1 text-sm">
              <input name="active" type="checkbox" defaultChecked /> Active
            </label>
            <button className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded">Add Product</button>
          </div>
        </form>
      </section>

      {/* ── 3. Bulk Import Codes ── */}
      <section className="rounded-xl border p-4 space-y-3">
        <h2 className="font-semibold text-lg">Bulk Import Redemption Codes</h2>
        <form action={handleBulkImport} className="space-y-2">
          <select name="product_id" required className="w-full border rounded px-3 py-1.5 text-sm">
            <option value="">— Select product —</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.partner_name} — {p.title}</option>
            ))}
          </select>
          <textarea
            name="codes"
            rows={6}
            placeholder="One code per line"
            required
            className="w-full border rounded px-3 py-1.5 text-sm font-mono"
          />
          <button className="bg-green-600 text-white text-sm px-4 py-1.5 rounded">Import Codes</button>
        </form>
      </section>

      {/* ── 4. Recent Orders ── */}
      <section className="rounded-xl border p-4 space-y-3">
        <h2 className="font-semibold text-lg">Recent Orders (last 100)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-1">Product</th>
                <th className="pb-1">Buyer</th>
                <th className="pb-1">Method</th>
                <th className="pb-1">Amount</th>
                <th className="pb-1">Status</th>
                <th className="pb-1">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b last:border-0">
                  <td className="py-1">{o.product_title}</td>
                  <td className="py-1 text-gray-500">{o.buyer_name}</td>
                  <td className="py-1">{o.payment_method}</td>
                  <td className="py-1">
                    {o.amount_points ? `${o.amount_points} pts` : ''}
                    {o.amount_vnd ? ` ${o.amount_vnd.toLocaleString()} ₫` : ''}
                  </td>
                  <td className="py-1">{o.status}</td>
                  <td className="py-1 text-gray-400 text-xs">{new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={6} className="py-4 text-center text-gray-400">No orders yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
