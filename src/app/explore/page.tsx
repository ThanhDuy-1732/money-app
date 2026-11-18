import Link from 'next/link'
import { FeedList } from '@/features/feed/components/FeedList'
import { createClient } from '@/lib/supabase/server'
import { searchContent } from '@/features/search/actions/search.actions'
import { SearchInput } from '@/features/search/components/SearchInput'
import {
  Avatar,
  Button,
  Card,
  CardBody,
  EmptyState,
  PageHeader,
  Section,
} from '@/components/ui'
import { cn } from '@/lib/cn'

const TABS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'posts', label: 'Bài đăng' },
  { value: 'users', label: 'Người dùng' },
]

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; type?: string | string[] }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { q: rawQ, type: rawType } = await searchParams
  const q = typeof rawQ === 'string' ? rawQ.trim() : ''
  const type = typeof rawType === 'string' && ['posts', 'users'].includes(rawType) ? rawType : 'all'

  const { posts: searchPosts, users: searchUsers } = q
    ? await searchContent(q)
    : { posts: [], users: [] }

  return (
    <main className="mx-auto max-w-narrow space-y-6 px-4 py-6">
      <PageHeader title="Khám phá" description="Tìm bài viết và người dùng." />

      <form action="/explore" method="GET">
        <div className="flex gap-2">
          <SearchInput defaultValue={q} />
          <Button type="submit">Tìm</Button>
        </div>
      </form>

      {q ? (
        <div className="space-y-6">
          <div className="flex gap-1 overflow-x-auto border-b border-border">
            {TABS.map(tab => (
              <Link
                key={tab.value}
                href={`/explore?q=${encodeURIComponent(q)}&type=${tab.value}`}
                className={cn(
                  '-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-semibold',
                  type === tab.value
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          {(type === 'all' || type === 'users') && searchUsers.length > 0 && (
            <Section title="Người dùng">
              <div className="grid gap-2">
                {searchUsers.map(u => (
                  <Link
                    key={u.id}
                    href={`/u/${u.username ?? u.id}`}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/40"
                  >
                    <Avatar src={u.avatar_url} fallback={u.display_name} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{u.display_name}</p>
                      {u.username && (
                        <p className="text-xs text-muted-foreground">@{u.username}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {type === 'users' && searchUsers.length === 0 && (
            <EmptyState
              title="Không tìm thấy người dùng"
              description={`Không có người dùng cho “${q}”.`}
            />
          )}

          {(type === 'all' || type === 'posts') && (
            <Section
              title={`Bài viết${searchPosts.length > 0 ? ` (${searchPosts.length})` : ''}`}
            >
              {searchPosts.length === 0 ? (
                <EmptyState
                  title="Không tìm thấy kết quả"
                  description={`Không có bài viết cho “${q}”.`}
                />
              ) : (
                <div className="space-y-3">
                  {searchPosts.map(p => (
                    <Card key={p.id}>
                      <CardBody className="pt-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">
                            {p.profiles.display_name}
                          </span>
                          <span>·</span>
                          <span>{new Date(p.created_at).toLocaleDateString('vi-VN')}</span>
                        </div>
                        <p className="mt-1 line-clamp-3 text-sm text-foreground">{p.content}</p>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
            </Section>
          )}
        </div>
      ) : (
        <FeedList userId={user?.id} />
      )}
    </main>
  )
}
