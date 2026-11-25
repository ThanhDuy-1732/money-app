import Link from 'next/link'
import { ArrowUpRight, Gift, Search, Sparkles, UserPlus, Users } from 'lucide-react'
import { Avatar, Badge, Button } from '@/components/ui'
import { FollowButton } from '@/features/profile/components/FollowButton'
import {
  FeatureTile,
  HighlightTile,
  StreakTile,
  TileHeader,
  TopicsTile,
  TrendingTile,
} from './bento-parts'
import type { ExploreData } from '../types'

export function BentoExplore({
  data,
  q,
  demo = false,
}: {
  data: ExploreData
  q?: string
  demo?: boolean
}) {
  const { featured, posts, people, rewards, topics, leaders, stats } = data
  const topLeader = leaders[0]
  const highlight = rewards[0]

  return (
    <main className="mx-auto max-w-default px-4 pb-16 pt-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-micro font-bold uppercase tracking-[0.2em] text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Khám phá
          </p>
          <h1 className="mt-1 text-h1 font-extrabold tracking-[-0.03em]">
            Tìm thứ đáng để học.
          </h1>
          <p className="mt-1 text-sm tabular text-muted-foreground">
            {stats.postsToday} bài hôm nay · {stats.streakToday} người giữ chuỗi ·{' '}
            {stats.members.toLocaleString('vi-VN')} thành viên
          </p>
        </div>
        <form action="/explore" method="GET" className="w-full md:w-80">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 transition-colors focus-within:border-primary">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              name="q"
              defaultValue={q}
              aria-label="Tìm bài viết và người dùng"
              placeholder="Tìm nhanh…"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <Button type="submit" size="sm" className="h-7 shrink-0 px-2.5">
              Tìm
            </Button>
          </div>
        </form>
      </header>

      <div className="mt-5 grid gap-3 md:grid-cols-6">
        {featured && <FeatureTile post={featured} />}

        <div className="grid content-start gap-3 md:col-span-2">
          {topLeader && <StreakTile leader={topLeader} />}
          {highlight && <HighlightTile reward={highlight} />}
        </div>

        <TrendingTile posts={posts} />

        {/* People */}
        <section className="flex h-full flex-col rounded-2xl border border-border bg-card p-4 md:col-span-3">
          <TileHeader
            icon={<Users className="h-3.5 w-3.5" />}
            title="Nên theo dõi"
            action={
              <Link
                href="/invite"
                className="text-[11px] font-semibold text-muted-foreground hover:text-primary"
              >
                Mời bạn
              </Link>
            }
          />
          <div className="space-y-2.5">
            {people.slice(0, 5).map(person => (
              <div key={person.id} className="flex items-center gap-2.5">
                <Avatar src={person.avatar_url} fallback={person.display_name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{person.display_name}</p>
                  <p className="truncate text-[11px] tabular text-muted-foreground">
                    {person.streak_count} ngày · {person.points_balance.toLocaleString('vi-VN')}{' '}
                    điểm
                  </p>
                </div>
                {demo ? (
                  <Button size="icon" variant="outline" className="h-8 w-8 shrink-0 rounded-full">
                    <UserPlus className="h-4 w-4" />
                  </Button>
                ) : (
                  <FollowButton
                    targetUserId={person.id}
                    initialFollowing={person.isFollowing ?? false}
                  />
                )}
              </div>
            ))}
          </div>
          {people.length === 0 && (
            <p className="py-2 text-sm text-muted-foreground">
              Chưa có gợi ý mới — mời bạn bè tham gia nhé.
            </p>
          )}
          <Link
            href="/invite"
            className="mt-auto inline-flex items-center gap-1 pt-3 text-[11px] font-semibold text-muted-foreground hover:text-primary"
          >
            Mời bạn bè, nhận điểm <ArrowUpRight className="h-3 w-3" />
          </Link>
        </section>

        {/* Rewards */}
        <section className="rounded-2xl border border-border bg-card p-4 md:col-span-4">
          <TileHeader
            icon={<Gift className="h-3.5 w-3.5" />}
            title="Đổi điểm lấy quà"
            action={
              <Link
                href="/shop"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-primary"
              >
                Cửa hàng <ArrowUpRight className="h-3 w-3" />
              </Link>
            }
          />
          {rewards.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">Cửa hàng đang cập nhật quà mới.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {rewards.slice(0, 3).map(reward => (
                <Link
                  key={reward.id}
                  href="/shop"
                  className="group rounded-xl border border-border bg-background p-3 transition-colors hover:border-primary/40"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {reward.partnerName}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm font-bold leading-snug">
                    {reward.title}
                  </p>
                  <Badge variant="coin" className="mt-2">
                    {reward.pricePoints.toLocaleString('vi-VN')} điểm
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </section>

        <TopicsTile topics={topics} />
      </div>
    </main>
  )
}
