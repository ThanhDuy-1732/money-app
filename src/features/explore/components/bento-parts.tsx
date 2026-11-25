import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  ArrowUpRight,
  Flame,
  Heart,
  MessageCircle,
  Sparkles,
} from 'lucide-react'
import {
  Avatar,
  Coin,
  Guilloche,
  Progress,
  WatermarkCoin,
} from '@/components/ui'
import { cn } from '@/lib/cn'
import type { ExploreLeader, ExplorePost, ExploreReward, ExploreTopic } from '../types'

export function TileHeader({
  icon,
  title,
  action,
}: {
  icon: ReactNode
  title: string
  action?: ReactNode
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
        {icon}
        {title}
      </div>
      {action}
    </div>
  )
}

export function FeatureTile({ post }: { post: ExplorePost }) {
  return (
    <article className="relative isolate overflow-hidden rounded-2xl bg-primary p-5 text-primary-foreground md:col-span-4 md:p-6">
      <Guilloche className="text-primary-foreground" opacity={0.07} />
      <WatermarkCoin
        className="-bottom-12 -right-2 text-primary-foreground"
        size={220}
        opacity={0.08}
      />
      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-coin px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-accent-foreground">
            Nổi bật
          </span>
          {post.topic && (
            <span className="text-micro font-bold uppercase tracking-[0.14em] text-primary-foreground/60">
              #{post.topic}
            </span>
          )}
        </div>
        <p className="mt-4 line-clamp-4 text-[1.35rem] font-extrabold leading-[1.2] tracking-[-0.02em] md:text-[1.6rem]">
          {post.content}
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-2.5 border-t border-primary-foreground/15 pt-4 md:mt-6">
          <Avatar src={post.author.avatar_url} fallback={post.author.display_name} size="sm" />
          <div className="min-w-0 text-xs">
            <p className="truncate font-semibold">{post.author.display_name}</p>
            <p className="text-primary-foreground/60">{post.timeLabel}</p>
          </div>
          <div className="ml-auto flex items-center gap-3 text-xs font-semibold tabular text-primary-foreground/80">
            <span className="inline-flex items-center gap-1">
              <Heart className="h-3.5 w-3.5" /> {post.likeCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" /> {post.commentCount}
            </span>
          </div>
        </div>
      </div>
    </article>
  )
}

export function StreakTile({ leader }: { leader: ExploreLeader }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <TileHeader
        icon={<Flame className="h-3.5 w-3.5 text-destructive" />}
        title="Chuỗi dẫn đầu"
      />
      <div className="flex items-center gap-2.5">
        <Avatar src={leader.avatar_url} fallback={leader.display_name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{leader.display_name}</p>
          <p className="text-xs text-muted-foreground">
            {leader.streak_count > 0 ? 'chuỗi liên tiếp' : 'chưa có chuỗi'}
          </p>
        </div>
        <span className="text-h2 font-extrabold tabular text-destructive">
          {leader.streak_count}
        </span>
      </div>
      <Progress
        value={leader.streak_count}
        max={Math.max(leader.streak_count, 1)}
        tone="lotus"
        className="mt-3 h-1.5"
      />
    </section>
  )
}

export function HighlightTile({ reward }: { reward: ExploreReward }) {
  return (
    <section className="relative isolate flex flex-1 flex-col justify-between overflow-hidden rounded-2xl border border-coin/30 bg-coin/15 p-4">
      <WatermarkCoin className="-bottom-8 -right-2" size={110} opacity={0.1} />
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-coin-deep">
            Đổi điểm hôm nay
          </p>
          <p className="mt-2 line-clamp-2 text-sm font-bold leading-snug">{reward.title}</p>
        </div>
        <Coin size={34} />
      </div>
      <div className="relative z-10 mt-3 flex items-center justify-between gap-2">
        <span className="text-sm font-extrabold tabular text-coin-deep">
          {reward.pricePoints.toLocaleString('vi-VN')} điểm
        </span>
        <Link
          href="/shop"
          className="inline-flex items-center gap-1 rounded-full bg-coin px-3 py-1.5 text-xs font-extrabold text-accent-foreground"
        >
          Đổi <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  )
}

export function TrendingTile({
  posts,
  className,
}: {
  posts: ExplorePost[]
  className?: string
}) {
  const maxLikes = Math.max(1, ...posts.map(post => post.likeCount))

  return (
    <section className={cn('rounded-2xl border border-border bg-card p-4 md:col-span-3', className)}>
      <TileHeader
        icon={<Heart className="h-3.5 w-3.5" />}
        title="Được thả tim nhiều"
        action={
          <Link
            href="/feed"
            className="text-[11px] font-semibold text-muted-foreground hover:text-primary"
          >
            Xem tất cả
          </Link>
        }
      />
      {posts.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">Chưa có bài viết nào.</p>
      ) : (
        <div className="space-y-0">
          {posts.slice(0, 5).map((post, index) => (
            <div
              key={post.id}
              className={cn(
                'group border-b border-border py-2.5 last:border-0 last:pb-0',
                index === 0 && 'pt-0'
              )}
            >
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 w-4 shrink-0 font-mono text-[11px] tabular text-muted-foreground">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium leading-snug">{post.content}</p>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="truncate font-semibold">{post.author.display_name}</span>
                    <span>·</span>
                    <span className="tabular">{post.timeLabel}</span>
                    <span className="ml-auto inline-flex shrink-0 items-center gap-1 tabular">
                      <Heart className="h-3 w-3" /> {post.likeCount}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/60"
                      style={{ width: `${Math.max(6, (post.likeCount / maxLikes) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export function TopicsTile({
  topics,
  className,
}: {
  topics: ExploreTopic[]
  className?: string
}) {
  return (
    <section className={cn('self-start rounded-2xl border border-border bg-card p-4 md:col-span-2', className)}>
      <TileHeader icon={<Sparkles className="h-3.5 w-3.5" />} title="Chủ đề" />
      <div className="flex flex-wrap gap-1.5">
        {topics.map(topic => (
          <Link
            key={topic.label}
            href={`/explore?q=${encodeURIComponent(topic.query)}`}
            className="rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            {topic.label}
          </Link>
        ))}
      </div>
    </section>
  )
}
