import Link from 'next/link'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/vi'
import { ArrowUpRight, SearchX } from 'lucide-react'
import { Avatar, Guilloche, WatermarkCoin } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { SearchPost, SearchUser } from '@/features/search/actions/search.actions'
import type { ExplorePost } from '../types'
import { ExploreSearch, PostTile, RailHeader } from './rails-parts'

dayjs.extend(relativeTime)
dayjs.locale('vi')

const TABS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'posts', label: 'Bài đăng' },
  { value: 'users', label: 'Người dùng' },
]

function toPost(post: SearchPost): ExplorePost {
  return {
    id: post.id,
    content: post.content,
    timeLabel: dayjs(post.created_at).fromNow(),
    likeCount: post.like_count,
    commentCount: post.comment_count,
    author: post.profiles,
  }
}

export function HybridSearchResults({
  q,
  type,
  posts,
  users,
}: {
  q: string
  type: string
  posts: SearchPost[]
  users: SearchUser[]
}) {
  const showUsers = type === 'all' || type === 'users'
  const showPosts = type === 'all' || type === 'posts'
  const total = users.length + posts.length
  const visibleUsers = showUsers ? users : []
  const visiblePosts = showPosts ? posts : []
  const empty = visibleUsers.length === 0 && visiblePosts.length === 0

  return (
    <main className="mx-auto max-w-default px-4 pb-16 pt-6">
      <section className="relative isolate overflow-hidden rounded-[28px] bg-secondary p-6 md:p-8">
        <Guilloche className="text-primary" opacity={0.09} />
        <WatermarkCoin className="-bottom-14 -right-2" size={220} opacity={0.06} />
        <div className="relative z-10">
          <p className="text-micro font-extrabold uppercase tracking-[0.18em] text-primary">
            Khám phá
          </p>
          <h1 className="mt-2 max-w-2xl break-words text-[1.7rem] font-extrabold leading-[1.1] tracking-[-0.03em] md:text-[2.3rem]">
            Kết quả cho “{q}”
          </h1>
          <p className="mt-1.5 text-sm tabular text-secondary-foreground/70">
            {total} kết quả · {posts.length} bài viết · {users.length} người dùng
          </p>
          <div className="max-w-xl">
            <ExploreSearch q={q} />
          </div>
        </div>
      </section>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-1">
          {TABS.map(tab => (
            <Link
              key={tab.value}
              href={`/explore?q=${encodeURIComponent(q)}&type=${tab.value}`}
              aria-current={type === tab.value ? 'page' : undefined}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors',
                type === tab.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/explore"
          className="rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          Về khám phá
        </Link>
      </div>

      {empty ? (
        <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-14 text-center">
          <SearchX className="h-7 w-7 text-muted-foreground" aria-hidden />
          <p className="mt-3 text-h3 font-bold">
            {type === 'users'
              ? 'Không tìm thấy người dùng'
              : type === 'posts'
                ? 'Không tìm thấy bài viết'
                : 'Không có kết quả'}
          </p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Thử từ khoá ngắn hơn, hoặc chọn một chủ đề đang hot ở trang khám phá.
          </p>
          {type !== 'all' && (
            <Link
              href={`/explore?q=${encodeURIComponent(q)}`}
              className="mt-3 text-xs font-semibold text-primary hover:underline"
            >
              Tìm trong tất cả kết quả
            </Link>
          )}
        </div>
      ) : null}

      {visibleUsers.length > 0 && (
        <section className="mt-8">
          <RailHeader title={`Người dùng (${visibleUsers.length})`} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleUsers.map(user => (
              <Link
                key={user.id}
                href={`/u/${user.username ?? user.id}`}
                className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
              >
                <Avatar src={user.avatar_url} fallback={user.display_name} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold group-hover:text-primary">
                    {user.display_name}
                  </p>
                  {user.username && (
                    <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
                  )}
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {visiblePosts.length > 0 && (
        <section className="mt-10">
          <RailHeader title={`Bài viết (${visiblePosts.length})`} />
          <div className="grid gap-3 sm:grid-cols-2">
            {visiblePosts.map((post, index) => (
              <PostTile
                key={post.id}
                post={toPost(post)}
                featured={index === 0 && visiblePosts.length % 2 === 1}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
