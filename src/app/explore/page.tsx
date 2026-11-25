import { createClient } from '@/lib/supabase/server'
import { searchContent } from '@/features/search/actions/search.actions'
import { getExploreData } from '@/features/explore/data'
import { HybridExplore } from '@/features/explore/components/hybrid-explore'
import { HybridSearchResults } from '@/features/explore/components/hybrid-search'

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; type?: string | string[] }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { q: rawQ, type: rawType } = await searchParams
  const q = typeof rawQ === 'string' ? rawQ.trim() : ''
  const type =
    typeof rawType === 'string' && ['posts', 'users'].includes(rawType) ? rawType : 'all'

  if (q) {
    const { posts, users } = await searchContent(q)
    return <HybridSearchResults q={q} type={type} posts={posts} users={users} />
  }

  const data = await getExploreData(user?.id)
  return <HybridExplore data={data} signedIn={Boolean(user)} />
}
