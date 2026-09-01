'use server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

// ponytail: sandbox URL — swap to https://pay.vnpay.vn/vpcpay.html for production
const VNPAY_URL = process.env.VNPAY_URL ?? 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'
const VNPAY_TMN_CODE = process.env.VNPAY_TMN_CODE ?? ''
const VNPAY_HASH_SECRET = process.env.VNPAY_HASH_SECRET ?? ''

function vnpaySign(params: Record<string, string>, secret: string): string {
  const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&')
  return crypto.createHmac('sha512', secret).update(Buffer.from(sorted, 'utf-8')).digest('hex')
}

export async function createVNPayOrder(
  amountVnd: number,
  ipAddr: string,
): Promise<{ url?: string; error: string | null }> {
  if (amountVnd < 10_000 || amountVnd > 50_000_000) return { error: 'Số tiền phải từ 10.000 đến 50.000.000 VNĐ' }
  if (!VNPAY_HASH_SECRET || !VNPAY_TMN_CODE) return { error: 'Chưa cấu hình cổng thanh toán' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  // VNPay TxnRef: max 20 chars, no hyphens
  const txnRef = crypto.randomUUID().replace(/-/g, '').slice(0, 20)

  const { error: dbError } = await supabase.from('payments').insert({
    user_id: user.id,
    amount_vnd: amountVnd,
    gateway: 'vnpay',
    gateway_txn_id: txnRef,
    status: 'pending',
  })
  if (dbError) return { error: dbError.message }

  const createDate = new Date()
    .toISOString()
    .replace(/[-T:.Z]/g, '')
    .slice(0, 14)

  const returnUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/wallet/topup/return`
  // IPN: Edge Function receives payment callback from VNPay server-to-server
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
  const paymentUrl = `${VNPAY_URL}?${new URLSearchParams(params)}`
  return { url: paymentUrl, error: null }
}

export async function verifyVNPayReturn(
  searchParams: Record<string, string>,
): Promise<{ success: boolean; amount?: number; txnRef?: string }> {
  const { vnp_SecureHash, vnp_SecureHashType: _t, ...rest } = searchParams
  if (!vnp_SecureHash || !VNPAY_HASH_SECRET) return { success: false }

  const computed = vnpaySign(rest, VNPAY_HASH_SECRET)
  if (computed !== vnp_SecureHash) return { success: false }

  const success = searchParams.vnp_ResponseCode === '00'
  const amount = searchParams.vnp_Amount ? Math.round(Number(searchParams.vnp_Amount) / 100) : undefined
  return { success, amount, txnRef: searchParams.vnp_TxnRef }
}
