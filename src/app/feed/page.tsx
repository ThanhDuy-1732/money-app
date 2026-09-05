import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PostComposer } from '@/features/feed/components/PostComposer'
import { FeedList } from '@/features/feed/components/FeedList'
import { WelcomeBanner } from '@/features/feed/components/WelcomeBanner'
import { NewPostsBanner } from '@/features/feed/components/NewPostsBanner'

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { welcome } = await searchParams

  // Fetch followingIds so NewPostsBanner can filter incoming posts
  const { data: following } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)
  const followingIds = [user.id, ...(following?.map(f => f.following_id) ?? [])]

  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {welcome === '1' && <WelcomeBanner />}
      <PostComposer userId={user.id} />
      <NewPostsBanner followingIds={followingIds} />
      <FeedList userId={user.id} followingOnly />
    </main>
  )
}
