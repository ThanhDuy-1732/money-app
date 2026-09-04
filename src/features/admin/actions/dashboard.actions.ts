'use server'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Chưa đăng nhập')
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (p?.role !== 'admin') throw new Error('Không có quyền admin')
  return supabase
}

export async function getRevenueSummary() {
  const supabase = await requireAdmin()

  const { data: payments } = await supabase
    .from('payments')
    .select('payment_type, amount_vnd, status, created_at')
    .eq('status', 'succeeded')

  const topup = payments?.filter(p => p.payment_type === 'topup')
    .reduce((s, p) => s + (p.amount_vnd ?? 0), 0) ?? 0
  const subscription = payments?.filter(p => p.payment_type === 'subscription')
    .reduce((s, p) => s + (p.amount_vnd ?? 0), 0) ?? 0
  const shop = payments?.filter(p => p.payment_type === 'shop_purchase')
    .reduce((s, p) => s + (p.amount_vnd ?? 0), 0) ?? 0

  const { count: activeSubscriptions } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  return { topup, subscription, shop, activeSubscriptions: activeSubscriptions ?? 0 }
}

export async function listRecentPayments(limit = 50) {
  const supabase = await requireAdmin()
  const { data } = await supabase
    .from('payments')
    .select('id, user_id, amount_vnd, payment_type, status, created_at, profiles(display_name)')
    .order('created_at', { ascending: false })
    .limit(limit)
  return data ?? []
}
