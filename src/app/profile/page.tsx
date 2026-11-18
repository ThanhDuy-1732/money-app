import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ProfileHeader } from '@/features/profile/components/ProfileHeader'
import { EditProfileForm } from '@/features/profile/components/EditProfileForm'
import { AvatarUpload } from '@/features/profile/components/AvatarUpload'
import {
  Button,
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
} from '@/components/ui'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return (
    <main className="mx-auto max-w-narrow space-y-6 px-4 py-6">
      <PageHeader
        title="Hồ sơ"
        description="Quản lý thông tin hiển thị của bạn."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={`/u/${profile.username ?? profile.id}`}>Xem trang công khai</Link>
          </Button>
        }
      />

      <Card>
        <CardBody className="pt-4">
          <div className="flex justify-center">
            <AvatarUpload userId={user.id} currentUrl={profile.avatar_url} />
          </div>
          <ProfileHeader profile={profile} showAvatar={false} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chỉnh sửa hồ sơ</CardTitle>
          <CardDescription>Cập nhật tên hiển thị và giới thiệu ngắn.</CardDescription>
        </CardHeader>
        <CardBody>
          <EditProfileForm
            defaultValues={{ display_name: profile.display_name, bio: profile.bio ?? undefined }}
          />
        </CardBody>
      </Card>
    </main>
  )
}
