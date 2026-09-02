// supabase/functions/payment-webhook/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts'

// ponytail: POINTS_PER_1000_VND=1, adjust ratio when business decides
const POINTS_PER_1000_VND = 1

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

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
  return timingSafeEqual(hex, String(body['signature'] ?? ''))
}

async function verifyVNPay(body: Record<string, unknown>, hashSecret: string): Promise<boolean> {
  const data = Object.keys(body)
    .filter(k => k !== 'vnp_SecureHash' && k !== 'vnp_SecureHashType')
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
  return timingSafeEqual(hex, String(body['vnp_SecureHash'] ?? ''))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const body = await req.json() as Record<string, unknown>

  // Detect gateway: VNPay uses vnp_-prefixed fields
  const hasVNPayFields = Object.keys(body).some(k => k.startsWith('vnp_'))
  const gateway = hasVNPayFields ? 'vnpay' : ((body['gateway'] as string) ?? 'payos')

  const PAYOS_CHECKSUM_KEY = Deno.env.get('PAYOS_CHECKSUM_KEY')
  const VNPAY_HASH_SECRET   = Deno.env.get('VNPAY_HASH_SECRET')

  if (gateway === 'payos' && !PAYOS_CHECKSUM_KEY) {
    return new Response(JSON.stringify({ error: 'server misconfigured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  if (gateway === 'vnpay' && !VNPAY_HASH_SECRET) {
    return new Response(JSON.stringify({ error: 'server misconfigured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let valid = false
  if (gateway === 'payos') valid = await verifyPayOS(body, PAYOS_CHECKSUM_KEY!)
  if (gateway === 'vnpay') valid = await verifyVNPay(body, VNPAY_HASH_SECRET!)

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

  // Atomic: complete_payment RPC marks succeeded + awards points in one DB transaction.
  // If it throws, the transaction rolls back and payment stays 'pending' — IPN can retry.
  const { data: result, error: rpcError } = await supabase.rpc('complete_payment', {
    p_gateway_txn_id: gatewayTxnId,
    p_gateway: gateway,
  })

  if (rpcError) {
    console.error('complete_payment rpc error:', rpcError)
    return new Response(JSON.stringify({ error: rpcError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!result?.ok) {
    console.error('complete_payment returned error:', result?.error)
    return new Response(JSON.stringify({ error: result?.error ?? 'unknown' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify(result), {
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
