'use server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { registerSchema, loginSchema, otpSchema } from '@/lib/validators/auth'

export async function signUpWithEmail(email: string, displayName: string) {
  const parsed = registerSchema.safeParse({ email, display_name: displayName })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      data: { display_name: parsed.data.display_name },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/feed`,
    },
  })
  if (error) return { error: error.message }
  return { error: null }
}

export async function verifyOtp(email: string, token: string) {
  const parsed = otpSchema.safeParse({ otp: token })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ email, token: parsed.data.otp, type: 'email' })
  if (error) return { error: error.message }
  redirect('/feed')
}

export async function signInWithEmail(email: string) {
  const parsed = loginSchema.safeParse({ email })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/feed` },
  })
  if (error) return { error: error.message }
  return { error: null }
}

export async function signInWithGoogle() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/feed` },
  })
  if (error) return { error: error.message }
  if (data.url) redirect(data.url)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
