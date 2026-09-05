import { FeedList } from '@/features/feed/components/FeedList'
import { createClient } from '@/lib/supabase/server'
import { searchContent } from '@/features/search/actions/search.actions'
import { SearchInput } from '@/features/search/components/SearchInput'
import Link from 'next/link'

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { q: rawQ } = await searchParams
  const q = typeof rawQ === 'string' ? rawQ.trim() : ''

  const { posts: searchPosts, users: searchUsers } = q
    ? await searchContent(q)
    : { posts: [], users: [] }

  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold">Khám phá</h1>

      {/* Search form — GET, no JS required; autocomplete via SearchInput */}
      <form action="/explore" method="GET">
        <div className="flex gap-2">
          <SearchInput defaultValue={q} />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg"
          >
            Tìm
          </button>
        </div>
      </form>

      {q ? (
        <div className="space-y-6">
          {/* Users section */}
          {searchUsers.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 mb-2">Người dùng</h2>
              <div className="space-y-2">
                {searchUsers.map(u => (
                  <Link
                    key={u.id}
                    href={`/u/${u.username ?? u.id}`}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
                  >
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
                        {u.display_name?.[0] ?? '?'}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold">{u.display_name}</p>
                      {u.username && <p className="text-xs text-gray-400">@{u.username}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Posts section */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 mb-2">
              Bài viết {searchPosts.length > 0 ? `(${searchPosts.length})` : ''}
            </h2>
            {searchPosts.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Không tìm thấy kết quả.</p>
            ) : (
              <div className="space-y-3">
                {searchPosts.map(p => (
                  <div key={p.id} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold">{p.profiles.display_name}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(p.created_at).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-3">{p.content}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : (
        /* Default: show public feed */
        <FeedList userId={user?.id} />
      )}
    </main>
  )
}
