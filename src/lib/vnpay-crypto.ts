import crypto from 'crypto'

/**
 * Builds the VNPay HMAC-SHA512 signature from sorted query params.
 * Keys are sorted alphabetically; values joined as key=value&key=value.
 */
export function vnpaySign(params: Record<string, string>, secret: string): string {
  const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&')
  return crypto.createHmac('sha512', secret).update(Buffer.from(sorted, 'utf-8')).digest('hex')
}

/**
 * Constant-time string comparison — prevents timing attacks on HMAC verification.
 * Returns false immediately if lengths differ (safe: length is not secret).
 */
export function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
}
