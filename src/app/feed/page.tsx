import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PostComposer } from '@/features/feed/components/PostComposer'
import { FeedList } from '@/features/feed/components/FeedList'
import { FeedMasthead } from '@/features/feed/components/FeedMasthead'
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

  const [{ data: profile }, { data: following }] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name, avatar_url, streak_count')
      .eq('id', user.id)
      .single(),
    supabase.from('follows').select('following_id').eq('follower_id', user.id),
  ])

  const followingIds = [user.id, ...(following?.map(f => f.following_id) ?? [])]
  const displayName = profile?.display_name ?? 'bạn'

  return (
    <main className="mx-auto max-w-narrow space-y-6 px-4 py-6">
      <FeedMasthead name={displayName} streak={profile?.streak_count ?? 0} />
      {welcome === '1' && <WelcomeBanner />}
      <PostComposer
        userId={user.id}
        displayName={displayName}
        avatarUrl={profile?.avatar_url ?? null}
      />
      <NewPostsBanner followingIds={followingIds} />

      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="text-micro font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Mới nhất
          </h2>
          <span className="h-px flex-1 bg-border" aria-hidden />
        </div>
        <FeedList userId={user.id} followingOnly />
      </section>
    </main>
  )
}
