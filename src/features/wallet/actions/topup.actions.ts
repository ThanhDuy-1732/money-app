'use server'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import crypto from 'crypto'
import { vnpaySign, timingSafeCompare } from '@/lib/vnpay-crypto'

// ponytail: sandbox URL — swap to https://pay.vnpay.vn/vpcpay.html for production
const VNPAY_URL = process.env.VNPAY_URL ?? 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'
const VNPAY_TMN_CODE = process.env.VNPAY_TMN_CODE ?? ''
const VNPAY_HASH_SECRET = process.env.VNPAY_HASH_SECRET ?? ''

// Mock mode: chỉ bật khi có VNPAY_MOCK=1 VÀ không phải production.
const IS_PROD = process.env.NODE_ENV === 'production'
const MOCK_MODE = process.env.VNPAY_MOCK === '1' && !IS_PROD

if (IS_PROD && (!VNPAY_TMN_CODE || !VNPAY_HASH_SECRET)) {
  throw new Error('[topup] VNPAY_TMN_CODE và VNPAY_HASH_SECRET phải được cấu hình trên production')
}

export async function createVNPayOrder(
  amountVnd: number,
): Promise<{ url?: string; error: string | null }> {
  if (amountVnd < 10_000 || amountVnd > 50_000_000) return { error: 'Số tiền phải từ 10.000 đến 50.000.000 VNĐ' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const txnRef = crypto.randomUUID().replace(/-/g, '').slice(0, 20)

  const { error: dbError } = await supabase.from('payments').insert({
    user_id: user.id,
    amount_vnd: amountVnd,
    gateway: 'vnpay',
    gateway_txn_id: txnRef,
    status: 'pending',
  })
  if (dbError) return { error: dbError.message }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const returnUrl = `${siteUrl}/wallet/topup/return`

  if (MOCK_MODE) {
    const mockUrl = `${siteUrl}/mock/vnpay?` + new URLSearchParams({ amount: String(amountVnd), txnRef })
    return { url: mockUrl, error: null }
  }

  // Read real client IP server-side — never accept from caller
  const reqHeaders = await headers()
  const ipAddr = reqHeaders.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1'

  const createDate = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14)
  const ipnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/payment-webhook`

  const params: Record<string, string> = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: VNPAY_TMN_CODE,
    vnp_Amount: String(amountVnd * 100),
    vnp_CurrCode: 'VND',
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: `Nap diem ${txnRef}`,
    vnp_OrderType: 'other',
    vnp_Locale: 'vn',
    vnp_ReturnUrl: returnUrl,
    vnp_IpnUrl: ipnUrl,
    vnp_CreateDate: createDate,
    vnp_IpAddr: ipAddr,
  }

  params.vnp_SecureHash = vnpaySign(params, VNPAY_HASH_SECRET)
  return { url: `${VNPAY_URL}?${new URLSearchParams(params)}`, error: null }
}

export async function verifyVNPayReturn(
  searchParams: Record<string, string>,
): Promise<{ success: boolean; amount?: number; txnRef?: string; mock?: boolean }> {
  if (MOCK_MODE) {
    const success = searchParams.vnp_ResponseCode === '00'
    const amount = searchParams.vnp_Amount ? Math.round(Number(searchParams.vnp_Amount) / 100) : undefined
    return { success, amount, txnRef: searchParams.vnp_TxnRef, mock: true }
  }

  const { vnp_SecureHash, vnp_SecureHashType: _t, ...rest } = searchParams
  if (!vnp_SecureHash) return { success: false }

  const computed = vnpaySign(rest, VNPAY_HASH_SECRET)
  if (!timingSafeCompare(computed, vnp_SecureHash)) return { success: false }

  const success = searchParams.vnp_ResponseCode === '00'
  const amount = searchParams.vnp_Amount ? Math.round(Number(searchParams.vnp_Amount) / 100) : undefined
  return { success, amount, txnRef: searchParams.vnp_TxnRef }
}
