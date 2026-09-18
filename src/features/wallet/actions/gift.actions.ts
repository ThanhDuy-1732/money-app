'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { giftPointsSchema } from '@/lib/validators/finance'

export async function giftPoints(
  toUserId: string,
  rawAmount: unknown
): Promise<{ error: string | null }> {
  const parsed = giftPointsSchema.safeParse({ amount: rawAmount })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  // ponytail: cast until supabase gen types regenerates with gift_points def
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.rpc as any)('gift_points', {
    p_to_user_id: toUserId,
    p_amount: parsed.data.amount,
  })

  if (error) return { error: error.message }

  revalidatePath('/wallet')
  revalidatePath(`/u`)
  return { error: null }
}
