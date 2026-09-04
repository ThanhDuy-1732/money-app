'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function listProducts(): Promise<any[]> {
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('shop_products')
    .select('*, shop_partners(name, logo_url)')
    .eq('active', true)
    .order('created_at', { ascending: false })
  return data ?? []
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getProduct(id: string): Promise<any> {
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('shop_products')
    .select('*, shop_partners(name, logo_url)')
    .eq('id', id)
    .eq('active', true)
    .single()
  return data
}

export async function purchaseWithPoints(
  productId: string,
): Promise<{ orderId: string | null; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { orderId: null, error: 'Chưa đăng nhập' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('purchase_product_with_points', {
    p_product_id: productId,
  })
  if (error) return { orderId: null, error: error.message }
  revalidatePath('/shop/orders')
  return { orderId: data, error: null }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function listMyOrders(): Promise<any[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await (supabase as any)
    .from('shop_orders')
    .select('*, shop_products(title, image_url, shop_partners(name))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function getOrderCode(
  orderId: string,
): Promise<{ code: string | null; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { code: null, error: 'Chưa đăng nhập' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('get_my_order_code', {
    p_order_id: orderId,
  })
  if (error) return { code: null, error: error.message }
  return { code: data, error: null }
}
