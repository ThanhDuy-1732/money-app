import { FeedList } from '@/features/feed/components/FeedList'
import { createClient } from '@/lib/supabase/server'

export default async function ExplorePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return (
    <main className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-6">Khám phá</h1>
      <FeedList userId={user?.id} />
    </main>
  )
}
