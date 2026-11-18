import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PostComposer } from '@/features/feed/components/PostComposer'
import { FeedList } from '@/features/feed/components/FeedList'
import { WelcomeBanner } from '@/features/feed/components/WelcomeBanner'
import { NewPostsBanner } from '@/features/feed/components/NewPostsBanner'
import { PageHeader } from '@/components/ui'

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { welcome } = await searchParams

  const { data: following } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)
  const followingIds = [user.id, ...(following?.map(f => f.following_id) ?? [])]

  return (
    <main className="mx-auto max-w-narrow space-y-6 px-4 py-6">
      <PageHeader title="Bảng tin" description="Bài đăng từ người bạn theo dõi." />
      {welcome === '1' && <WelcomeBanner />}
      <PostComposer userId={user.id} />
      <NewPostsBanner followingIds={followingIds} />
      <FeedList userId={user.id} followingOnly />
    </main>
  )
}
