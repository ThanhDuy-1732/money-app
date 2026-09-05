import { NextRequest, NextResponse } from 'next/server'
import { resolveReferralCode } from '@/features/referral/actions/join.actions'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('ref')

  const response = NextResponse.redirect(new URL('/register', request.url))

  if (code) {
    const { referrerId } = await resolveReferralCode(code)
    if (referrerId) {
      response.cookies.set('ref_code', code, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      })
    }
  }

  return response
}
