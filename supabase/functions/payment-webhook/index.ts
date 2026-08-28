// supabase/functions/payment-webhook/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts'

// ponytail: POINTS_PER_1000_VND=1, adjust ratio when business decides
const POINTS_PER_1000_VND = 1

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function verifyPayOS(body: Record<string, unknown>, checksumKey: string): Promise<boolean> {
  const data = Object.keys(body)
    .filter(k => k !== 'signature')
    .sort()
    .map(k => `${k}=${body[k]}`)
    .join('&')
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(checksumKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
  return hex === body['signature']
}

async function verifyVNPay(body: Record<string, unknown>, hashSecret: string): Promise<boolean> {
  const data = Object.keys(body)
    .filter(k => k !== 'vnp_SecureHash')
    .sort()
    .map(k => `${k}=${body[k]}`)
    .join('&')
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(hashSecret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
  return hex === body['vnp_SecureHash']
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const body = await req.json() as Record<string, unknown>

  // Detect gateway: VNPay uses vnp_-prefixed fields
  const hasVNPayFields = Object.keys(body).some(k => k.startsWith('vnp_'))
  const gateway = hasVNPayFields ? 'vnpay' : ((body['gateway'] as string) ?? 'payos')

  const PAYOS_CHECKSUM_KEY = Deno.env.get('PAYOS_CHECKSUM_KEY') ?? ''
  const VNPAY_HASH_SECRET   = Deno.env.get('VNPAY_HASH_SECRET') ?? ''

  let valid = false
  if (gateway === 'payos') valid = await verifyPayOS(body, PAYOS_CHECKSUM_KEY)
  if (gateway === 'vnpay') valid = await verifyVNPay(body, VNPAY_HASH_SECRET)

  if (!valid) {
    return new Response(JSON.stringify({ error: 'Invalid checksum' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Only process on success status
  const status = (gateway === 'vnpay' ? body['vnp_ResponseCode'] : body['status']) as string
  const isSuccess = gateway === 'vnpay' ? status === '00' : status === 'PAID'
  if (!isSuccess) {
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const gatewayTxnId = (gateway === 'vnpay' ? body['vnp_TxnRef'] : body['orderCode']) as string

  // Idempotent: only update rows still in 'pending' — if already processed, .single() returns null
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .update({ status: 'succeeded', gateway_txn_id: gatewayTxnId })
    .eq('gateway_txn_id', gatewayTxnId)
    .eq('status', 'pending')
    .select('id, user_id, amount_vnd')
    .single()

  if (paymentError || !payment) {
    console.error('Payment not found or already processed:', paymentError)
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const pointsDelta = Math.floor(payment.amount_vnd / 1000) * POINTS_PER_1000_VND
  if (pointsDelta > 0) {
    const { error: pointsError } = await supabase.rpc('add_points', {
      p_user_id: payment.user_id,
      p_delta: pointsDelta,
      p_reason_code: 'adjustment',
      p_reference_id: payment.id,
    })
    if (pointsError) console.error('add_points error:', pointsError)
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})

// Self-test: deno run --allow-env supabase/functions/payment-webhook/index.ts
if (import.meta.main) {
  const SECRET = 'test-secret'

  async function hmac(alg: 'SHA-256' | 'SHA-512', secret: string, data: string): Promise<string> {
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret),
      { name: 'HMAC', hash: alg }, false, ['sign']
    )
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
    return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  // payOS: sorted fields minus 'signature', joined &, HMAC-SHA256
  const payOSBody = { gateway: 'payos', orderCode: 'ORD123', status: 'PAID' }
  const payOSData = Object.keys(payOSBody).sort().map(k => `${k}=${(payOSBody as Record<string,unknown>)[k]}`).join('&')
  const payOSSig = await hmac('SHA-256', SECRET, payOSData)
  const payOSResult = await verifyPayOS({ ...payOSBody, signature: payOSSig }, SECRET)
  console.assert(payOSResult === true, 'verifyPayOS valid sig should return true')
  const payOSBadResult = await verifyPayOS({ ...payOSBody, signature: 'bad' }, SECRET)
  console.assert(payOSBadResult === false, 'verifyPayOS bad sig should return false')

  // VNPay: sorted fields minus 'vnp_SecureHash', joined &, HMAC-SHA512
  const vnBody = { vnp_TxnRef: 'TXN456', vnp_ResponseCode: '00', vnp_Amount: '100000' }
  const vnData = Object.keys(vnBody).sort().map(k => `${k}=${(vnBody as Record<string,unknown>)[k]}`).join('&')
  const vnSig = await hmac('SHA-512', SECRET, vnData)
  const vnResult = await verifyVNPay({ ...vnBody, vnp_SecureHash: vnSig }, SECRET)
  console.assert(vnResult === true, 'verifyVNPay valid sig should return true')
  const vnBadResult = await verifyVNPay({ ...vnBody, vnp_SecureHash: 'bad' }, SECRET)
  console.assert(vnBadResult === false, 'verifyVNPay bad sig should return false')

  console.log('Self-test passed: verifyPayOS and verifyVNPay both correct')
  Deno.exit(0)
}
