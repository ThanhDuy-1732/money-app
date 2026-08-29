import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileHeader } from '@/features/profile/components/ProfileHeader'
import { EditProfileForm } from '@/features/profile/components/EditProfileForm'
import { AvatarUpload } from '@/features/profile/components/AvatarUpload'
import { recordLogin } from '@/features/profile/actions/streak.actions'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await recordLogin()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return (
    <main className="max-w-lg mx-auto px-4">
      <AvatarUpload userId={user.id} currentUrl={profile.avatar_url} />
      <ProfileHeader profile={profile} />
      <section className="mt-6">
        <h2 className="text-lg font-semibold mb-4">Chỉnh sửa hồ sơ</h2>
        <EditProfileForm defaultValues={{ display_name: profile.display_name, bio: profile.bio ?? undefined }} />
      </section>
    </main>
  )
}
