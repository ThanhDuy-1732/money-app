import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { resolveReferralCode } from '@/features/referral/actions/join.actions'

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>
}) {
  const params = await searchParams
  const code = params.ref?.trim().toLowerCase()

  if (!code) redirect('/register')

  const { referrerId } = await resolveReferralCode(code)
  if (!referrerId) redirect('/register')

  // Store referral code in cookie (7 days) then redirect to register
  const cookieStore = await cookies()
  cookieStore.set('ref_code', code, {
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
  })

  redirect('/register')
}
