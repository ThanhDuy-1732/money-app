'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return supabase
}

export async function listPartners() {
  const supabase = await requireAdmin()
  const { data } = await (supabase as any).from('shop_partners').select('*').order('name')
  return (data ?? []) as Array<{ id: string; name: string; logo_url: string | null; active: boolean }>
}

export async function upsertPartner(data: {
  id?: string
  name: string
  logo_url: string
  active: boolean
}) {
  const supabase = await requireAdmin()
  const { id, ...rest } = data
  if (id) {
    await (supabase as any).from('shop_partners').update(rest).eq('id', id)
  } else {
    await (supabase as any).from('shop_partners').insert(rest)
  }
  revalidatePath('/admin/shop')
}

export async function listProducts() {
  const supabase = await requireAdmin()
  const { data } = await (supabase as any)
    .from('shop_products')
    .select('*, shop_partners(name)')
    .order('title')
  // flatten partner_name
  return ((data ?? []) as any[]).map((p: any) => ({
    ...p,
    partner_name: p.shop_partners?.name ?? '',
  }))
}

export async function upsertProduct(data: {
  id?: string
  partner_id: string
  title: string
  description: string
  image_url: string
  price_points?: number | null
  price_vnd?: number | null
  active: boolean
}) {
  const supabase = await requireAdmin()
  const { id, ...rest } = data
  if (id) {
    await (supabase as any).from('shop_products').update(rest).eq('id', id)
  } else {
    await (supabase as any).from('shop_products').insert(rest)
  }
  revalidatePath('/admin/shop')
}

export async function bulkImportCodes(
  productId: string,
  codesText: string
): Promise<{ imported: number }> {
  const supabase = await requireAdmin()
  const rows = codesText
    .split('\n')
    .map((c) => c.trim())
    .filter(Boolean)
    .map((code) => ({ product_id: productId, code }))

  if (rows.length === 0) return { imported: 0 }

  // ignore conflicts — duplicate codes already in DB stay as-is
  // ponytail: no batching; Supabase REST limit ~1000 rows, add batching if needed
  const { data } = await (supabase as any)
    .from('shop_product_codes')
    .upsert(rows, { onConflict: 'product_id,code', ignoreDuplicates: true })
    .select('id')

  revalidatePath('/admin/shop')
  return { imported: (data as any[])?.length ?? rows.length }
}

export async function listOrders() {
  const supabase = await requireAdmin()
  const { data } = await (supabase as any)
    .from('shop_orders')
    .select('*, shop_products(title), profiles(display_name)')
    .order('created_at', { ascending: false })
    .limit(100)
  return ((data ?? []) as any[]).map((o: any) => ({
    ...o,
    product_title: o.shop_products?.title ?? '',
    buyer_name: o.profiles?.display_name ?? '',
  }))
}
