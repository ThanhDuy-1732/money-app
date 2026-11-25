import Link from 'next/link'
import {
  ArrowRight,
  ArrowUpRight,
  Flame,
  Gift,
  Heart,
  MessageCircle,
  Newspaper,
  Search,
  Sparkles,
  Trophy,
  UserPlus,
} from 'lucide-react'
import {
  Avatar,
  Badge,
  Button,
  Coin,
  Guilloche,
  Progress,
  WatermarkCoin,
} from '@/components/ui'
import { FollowButton } from '@/features/profile/components/FollowButton'
import { cn } from '@/lib/cn'
import type {
  ExploreLeader,
  ExplorePerson,
  ExplorePost,
  ExploreReward,
  ExploreStats,
  ExploreTopic,
} from '../types'

export function ExploreHero({ stats }: { stats: ExploreStats }) {
  return (
    <section className="relative isolate overflow-hidden rounded-[28px] bg-secondary p-6 md:p-9">
      <Guilloche className="text-primary" opacity={0.09} />
      <div className="relative z-10 grid items-center gap-6 md:grid-cols-[1fr_auto]">
        <div>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-card/60 px-3 py-1 text-micro font-extrabold uppercase tracking-[0.14em] text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Khám phá
          </p>
          <h1 className="mt-3 max-w-md text-[2rem] font-extrabold leading-[1.05] tracking-[-0.035em] md:text-[2.6rem]">
            Hôm nay, học một điều mới về tiền.
          </h1>
          <p className="mt-2 max-w-sm text-sm text-secondary-foreground/70">
            {stats.postsToday} bài mới, {stats.members.toLocaleString('vi-VN')} người đang cùng
            bạn quản lý chi tiêu.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button asChild>
              <Link href="/feed">
                <Newspaper className="h-4 w-4" /> Xem bảng tin
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/shop">
                <Gift className="h-4 w-4" /> Đổi điểm
              </Link>
            </Button>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-secondary-foreground/60">
            <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
            {stats.streakToday} người đang giữ chuỗi
          </p>
        </div>
        <div className="relative hidden h-40 w-40 shrink-0 items-center justify-center md:flex">
          <span className="absolute inset-0 rounded-full border border-primary/25" />
          <span className="absolute inset-4 rounded-full border border-dashed border-primary/25" />
          <Coin size={96} className="relative z-10" />
          <span className="absolute -bottom-1 right-0 rounded-full border border-primary/20 bg-card px-2 py-1 text-[10px] font-extrabold text-primary">
            10 điểm / ngày
          </span>
        </div>
      </div>
    </section>
  )
}

export function ExploreSearch({ q }: { q?: string }) {
  return (
    <form action="/explore" method="GET" className="mt-4">
      <div className="flex items-center gap-2 rounded-full border-2 border-border bg-card p-1.5 pl-4 transition-colors focus-within:border-primary">
        <Search className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        <input
          name="q"
          defaultValue={q}
          aria-label="Tìm bài viết và người dùng"
          placeholder="Tìm bài viết, người dùng…"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground"
        />
        <Button type="submit" className="shrink-0 rounded-full px-5">
          Tìm
        </Button>
      </div>
    </form>
  )
}

export function TopicStrip({ topics }: { topics: ExploreTopic[] }) {
  return (
    <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
      <span className="inline-flex shrink-0 items-center gap-1 text-micro font-bold uppercase tracking-[0.14em] text-muted-foreground">
        <Flame className="h-3.5 w-3.5 text-destructive" /> Đang hot
      </span>
      {topics.map(topic => (
        <Link
          key={topic.label}
          href={`/explore?q=${encodeURIComponent(topic.query)}`}
          className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          {topic.label}
        </Link>
      ))}
    </div>
  )
}

export function RailHeader({
  title,
  hint,
  href,
}: {
  title: string
  hint?: string
  href?: string
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-h3 font-extrabold tracking-tight">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary"
        >
          Xem tất cả <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  )
}

export function PostTile({ post, featured = false }: { post: ExplorePost; featured?: boolean }) {
  return (
    <article
      className={cn(
        'relative flex flex-col justify-between overflow-hidden rounded-2xl border p-5',
        featured ? 'border-primary/30 bg-primary/5 sm:col-span-2 md:p-6' : 'border-border bg-card'
      )}
    >
      {featured && <WatermarkCoin className="-bottom-10 -right-2" size={150} opacity={0.04} />}
      <div className="relative z-10">
        <div className="flex items-center gap-2 text-xs">
          <Avatar
            src={post.author.avatar_url}
            fallback={post.author.display_name}
            size="sm"
            className="h-7 w-7 text-[10px]"
          />
          <span className="font-semibold">{post.author.display_name}</span>
          <span className="text-muted-foreground">· {post.timeLabel}</span>
          {post.topic && (
            <Badge variant="neutral" className="ml-auto shrink-0">
              {post.topic}
            </Badge>
          )}
        </div>
        <p
          className={cn(
            'mt-3 leading-relaxed',
            featured
              ? 'text-[1.15rem] font-bold tracking-[-0.01em] md:text-[1.35rem] md:leading-snug'
              : 'text-sm'
          )}
        >
          {post.content}
        </p>
      </div>
      <div className="relative z-10 mt-4 flex items-center gap-4 text-xs font-semibold text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Heart className="h-3.5 w-3.5" /> {post.likeCount}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MessageCircle className="h-3.5 w-3.5" /> {post.commentCount}
        </span>
        <ArrowUpRight className="ml-auto h-4 w-4 opacity-40" />
      </div>
    </article>
  )
}

export function PeopleRail({
  people,
  demo = false,
  signedIn = true,
}: {
  people: ExplorePerson[]
  demo?: boolean
  signedIn?: boolean
}) {
  return (
    <section className="mt-10">
      <RailHeader
        title="Người nên theo dõi"
        hint="Những người đang giữ chuỗi điểm danh dài."
        href="/invite"
      />
      {people.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Chưa có gợi ý mới — mời bạn bè tham gia nhé.
        </p>
      ) : (
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 lg:grid-cols-5">
          {people.map(person => (
            <div
              key={person.id}
              className="flex w-[190px] shrink-0 snap-start flex-col items-center rounded-2xl border border-border bg-card p-4 text-center md:w-auto"
            >
              <Avatar
                src={person.avatar_url}
                fallback={person.display_name}
                size="lg"
                className="ring-2 ring-primary/15 ring-offset-2 ring-offset-card"
              />
              <p className="mt-2.5 w-full truncate text-sm font-bold">{person.display_name}</p>
              <p className="w-full truncate text-xs text-muted-foreground">
                @{person.username ?? 'moneyapp'}
              </p>
              <Badge variant="coin" className="mt-2">
                <Flame className="h-3 w-3" /> {person.streak_count} ngày
              </Badge>
              <div className="mt-3 w-full">
                {demo ? (
                  <Button size="sm" variant="outline" fullWidth>
                    <UserPlus className="h-4 w-4" /> Theo dõi
                  </Button>
                ) : signedIn ? (
                  <FollowButton
                    targetUserId={person.id}
                    initialFollowing={person.isFollowing ?? false}
                  />
                ) : (
                  <Button asChild size="sm" variant="outline" fullWidth>
                    <Link href="/login">
                      <UserPlus className="h-4 w-4" /> Theo dõi
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export function RewardsRail({ rewards }: { rewards: ExploreReward[] }) {
  return (
    <section className="mt-10">
      <RailHeader title="Đổi điểm lấy quà" hint="Quà mới từ đối tác." href="/shop" />
      {rewards.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Cửa hàng đang cập nhật quà mới.
        </p>
      ) : (
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
          {rewards.map(reward => (
            <Link
              key={reward.id}
              href="/shop"
              className="group relative flex w-[220px] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-4 transition-colors hover:border-coin/60 md:w-auto"
            >
              <WatermarkCoin className="-bottom-6 -right-2" size={90} opacity={0.05} />
              <div className="relative z-10 flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    {reward.partnerName}
                  </p>
                  <p className="mt-1.5 line-clamp-2 text-sm font-bold leading-snug">
                    {reward.title}
                  </p>
                </div>
                <Coin size={28} />
              </div>
              <div className="relative z-10 mt-4 flex items-center justify-between">
                <span className="text-sm font-extrabold tabular text-coin-deep">
                  {reward.pricePoints.toLocaleString('vi-VN')}
                  <span className="ml-1 text-[10px] font-bold text-muted-foreground">điểm</span>
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground group-hover:text-primary">
                  Đổi <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

export function StreakLeaderboard({ leaders }: { leaders: ExploreLeader[] }) {
  const podium = [leaders[1], leaders[0], leaders[2]].filter(Boolean)
  const rest = leaders.slice(3)

  return (
    <section className="mt-10 rounded-3xl border border-border bg-card p-5 md:p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-h3 font-extrabold tracking-tight">
            <Trophy className="h-5 w-5 text-coin-deep" /> Bảng xếp hạng tuần
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Ai giữ chuỗi điểm danh dài nhất.</p>
        </div>
        <Link
          href="/profile"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary"
        >
          Chuỗi của tôi <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {leaders.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Chưa có ai trên bảng xếp hạng.
        </p>
      ) : leaders.length < 3 ? (
        <div className="mt-4 space-y-2">
          {leaders.map((person, index) => (
            <div
              key={person.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5"
            >
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold',
                  index === 0
                    ? 'bg-coin text-accent-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {index + 1}
              </span>
              <Avatar src={person.avatar_url} fallback={person.display_name} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                {person.display_name}
              </span>
              <span className="shrink-0 text-sm font-extrabold tabular">
                {person.streak_count}
                <span className="ml-1 text-[10px] font-semibold text-muted-foreground">ngày</span>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-3 items-end gap-2 md:gap-4">
            {podium.map(person => {
              const rank = leaders.findIndex(l => l.id === person.id) + 1
              const first = rank === 1
              return (
                <div
                  key={person.id}
                  className={cn(
                    'flex flex-col items-center rounded-2xl border p-3 text-center md:p-4',
                    first ? 'border-coin/40 bg-coin/10 md:-mt-3' : 'border-border bg-background'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold',
                      first ? 'bg-coin text-accent-foreground' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {rank}
                  </span>
                  <Avatar
                    src={person.avatar_url}
                    fallback={person.display_name}
                    size={first ? 'lg' : 'md'}
                    className="mt-2"
                  />
                  <p className="mt-2 w-full truncate text-xs font-bold md:text-sm">
                    {person.display_name}
                  </p>
                  <p
                    className={cn(
                      'font-extrabold tabular',
                      first ? 'text-h2 text-coin-deep' : 'text-h3'
                    )}
                  >
                    {person.streak_count}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    ngày
                  </p>
                </div>
              )
            })}
          </div>

          {rest.length > 0 && (
            <div className="mt-4 space-y-2 border-t border-border pt-4">
              {rest.map((person, index) => (
                <div key={person.id} className="flex items-center gap-3">
                  <span className="w-4 font-mono text-[11px] text-muted-foreground">
                    {index + 4}
                  </span>
                  <Avatar src={person.avatar_url} fallback={person.display_name} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {person.display_name}
                  </span>
                  <Progress
                    value={person.streak_count}
                    max={Math.max(1, leaders[0]?.streak_count ?? 1)}
                    className="hidden h-1 w-24 sm:block"
                  />
                  <span className="text-xs font-bold tabular text-muted-foreground">
                    {person.streak_count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}
