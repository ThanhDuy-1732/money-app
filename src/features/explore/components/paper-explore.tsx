import Link from 'next/link'
import { ArrowUpRight, Flame, Heart, MessageCircle, Sparkles } from 'lucide-react'
import {
  Avatar,
  Button,
  Coin,
  Guilloche,
  Progress,
  WatermarkCoin,
} from '@/components/ui'
import { FollowButton } from '@/features/profile/components/FollowButton'
import { PaperMasthead, PaperRule, PaperSearchForm } from './paper-chrome'
import type { ExploreData } from '../types'

export function PaperExplore({
  data,
  q,
  demo = false,
  signedIn = true,
}: {
  data: ExploreData
  q?: string
  demo?: boolean
  signedIn?: boolean
}) {
  const { featured, posts, people, rewards, topics, leaders, stats } = data
  const maxStreak = Math.max(1, ...leaders.map(l => l.streak_count))

  return (
    <main className="mx-auto max-w-default px-4 pb-16 pt-8">
      {/* Masthead */}
      <PaperMasthead subtitle="Bài viết, người và phần thưởng đáng chú ý trong cộng đồng MoneyApp." />

      {/* Search */}
      <PaperSearchForm q={q} />

      {topics.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-micro font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Đang hot
          </span>
          {topics.slice(0, 6).map(topic => (
            <Link
              key={topic.label}
              href={`/explore?q=${encodeURIComponent(topic.query)}`}
              className="rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              #{topic.label}
            </Link>
          ))}
        </div>
      )}

      {/* Featured */}
      {featured && (
        <section className="relative isolate mt-8 overflow-hidden rounded-2xl bg-inverse text-inverse-foreground">
          <Guilloche className="text-inverse-foreground" opacity={0.07} />
          <WatermarkCoin className="-bottom-16 -right-2" size={280} opacity={0.07} />
          <div className="relative z-10 grid md:grid-cols-[1.45fr_0.55fr]">
            <div className="p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-coin px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-accent-foreground">
                  <Sparkles className="h-3 w-3" /> Nổi bật
                </span>
                {featured.topic && (
                  <span className="text-micro font-bold uppercase tracking-[0.18em] text-inverse-foreground/60">
                    #{featured.topic}
                  </span>
                )}
              </div>
              <p className="mt-4 text-[1.5rem] font-extrabold leading-[1.18] tracking-[-0.02em] md:text-[1.85rem]">
                {featured.content}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-inverse-foreground/15 pt-4">
                <Avatar
                  src={featured.author.avatar_url}
                  fallback={featured.author.display_name}
                  size="sm"
                />
                <div className="min-w-0 text-xs">
                  <p className="font-semibold">{featured.author.display_name}</p>
                  <p className="text-inverse-foreground/60">{featured.timeLabel}</p>
                </div>
                <div className="ml-auto flex items-center gap-4 text-xs font-semibold tabular text-inverse-foreground/80">
                  <span className="inline-flex items-center gap-1.5">
                    <Heart className="h-4 w-4" /> {featured.likeCount}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MessageCircle className="h-4 w-4" /> {featured.commentCount}
                  </span>
                </div>
              </div>
            </div>
            <div className="border-t border-inverse-foreground/15 bg-inverse-foreground/[0.06] p-6 md:border-l md:border-t-0">
              <p className="text-micro font-bold uppercase tracking-[0.2em] text-inverse-foreground/60">
                Cộng đồng hôm nay
              </p>
              <dl className="mt-4 space-y-3">
                {[
                  ['Thành viên', stats.members.toLocaleString('vi-VN')],
                  ['Bài hôm nay', String(stats.postsToday)],
                  ['Đang giữ chuỗi', String(stats.streakToday)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-baseline justify-between gap-3 border-b border-inverse-foreground/10 pb-2.5 last:border-0 last:pb-0"
                  >
                    <dt className="text-xs text-inverse-foreground/60">{label}</dt>
                    <dd className="text-h3 font-extrabold tabular">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-inverse-foreground/50">
                <span className="h-1.5 w-1.5 rounded-full bg-coin" /> Đang diễn ra
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Body */}
      <div className="mt-10 grid gap-10 lg:grid-cols-[1.55fr_1fr] lg:gap-12">
        <div>
          <PaperRule
            index="01"
            title="Bài viết nổi bật"
            action={
              <Link
                href="/feed"
                className="text-xs font-semibold text-muted-foreground hover:text-primary"
              >
                Bảng tin
              </Link>
            }
          />
          <ol className="divide-y divide-border border-b border-border">
            {posts.map((post, index) => (
              <li key={post.id} className="group py-5 first:pt-0">
                <div className="flex items-start gap-3">
                  <span className="mt-1 shrink-0 font-mono text-[11px] tabular text-muted-foreground">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs">
                      <Avatar
                        src={post.author.avatar_url}
                        fallback={post.author.display_name}
                        size="sm"
                        className="h-6 w-6 text-[10px]"
                      />
                      <span className="font-semibold">{post.author.display_name}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground">{post.timeLabel}</span>
                      {post.topic && (
                        <span className="ml-auto hidden shrink-0 text-micro font-bold uppercase tracking-[0.1em] text-muted-foreground sm:block">
                          #{post.topic}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-[15px] leading-relaxed text-foreground">
                      {post.content}
                    </p>
                    <div className="mt-2.5 flex items-center gap-4 text-micro font-semibold text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Heart className="h-3.5 w-3.5" /> {post.likeCount}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MessageCircle className="h-3.5 w-3.5" /> {post.commentCount}
                      </span>
                    </div>
                  </div>
                  <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </li>
            ))}
          </ol>
          {posts.length === 0 && (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              Chưa có bài viết nào. Hãy là người mở chủ đề đầu tiên.
            </p>
          )}
        </div>

        <aside className="space-y-8">
          <section>
            <PaperRule index="02" title="Người nên theo dõi" />
            <div className="divide-y divide-border">
              {people.map(person => (
                <div key={person.id} className="flex items-center gap-3 py-3 first:pt-0">
                  <Avatar src={person.avatar_url} fallback={person.display_name} />
                  <div className="min-w-0 flex-1">
                    {person.username ? (
                      <Link
                        href={`/u/${person.username}`}
                        className="block truncate text-sm font-semibold hover:text-primary"
                      >
                        {person.display_name}
                      </Link>
                    ) : (
                      <p className="truncate text-sm font-semibold">{person.display_name}</p>
                    )}
                    <p className="truncate text-xs text-muted-foreground">
                      @{person.username ?? 'moneyapp'} · {person.streak_count} ngày
                    </p>
                  </div>
                  {demo ? (
                    <Button size="sm" variant="outline" className="shrink-0">
                      Theo dõi
                    </Button>
                  ) : signedIn ? (
                    <FollowButton
                      targetUserId={person.id}
                      initialFollowing={person.isFollowing ?? false}
                    />
                  ) : (
                    <Button asChild size="sm" variant="outline" className="shrink-0">
                      <Link href="/login">Theo dõi</Link>
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {people.length === 0 && (
              <p className="py-2 text-sm text-muted-foreground">
                Chưa có gợi ý mới — mời bạn bè tham gia nhé.
              </p>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-micro font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Chuỗi dài nhất
              </p>
              <Flame className="h-4 w-4 text-destructive" aria-hidden />
            </div>
            <div className="mt-4 space-y-3">
              {leaders.slice(0, 3).map((leader, index) => (
                <div key={leader.id}>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-4 shrink-0 font-mono text-[10px] tabular text-muted-foreground">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold">
                      {leader.display_name}
                    </span>
                    <span className="font-bold tabular text-primary">{leader.streak_count}</span>
                  </div>
                  <Progress
                    value={leader.streak_count}
                    max={maxStreak}
                    className="ml-6 mt-1.5 h-1 w-auto"
                  />
                </div>
              ))}
            </div>
            <Link
              href="/profile"
              className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary"
            >
              Xem chuỗi của bạn <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </section>

          <section className="relative isolate overflow-hidden rounded-xl border border-coin/30 bg-coin/10 p-5">
            <WatermarkCoin className="-bottom-10 -right-3" size={140} opacity={0.05} />
            <div className="flex items-center gap-2">
              <Coin size={18} />
              <p className="text-micro font-bold uppercase tracking-[0.18em] text-coin-deep">
                Đổi điểm
              </p>
            </div>
            <div className="relative z-10 mt-3 space-y-3">
              {rewards.slice(0, 2).map(reward => (
                <Link
                  key={reward.id}
                  href="/shop"
                  className="flex items-baseline justify-between gap-2 border-b border-coin/20 pb-2 last:border-0 last:pb-0"
                >
                  <span className="min-w-0 truncate text-sm font-semibold">{reward.title}</span>
                  <span className="shrink-0 text-xs font-bold tabular text-coin-deep">
                    {reward.pricePoints.toLocaleString('vi-VN')} đ
                  </span>
                </Link>
              ))}
            </div>
            {rewards.length === 0 && (
              <p className="relative z-10 text-sm text-coin-deep/80">
                Cửa hàng đang cập nhật quà mới.
              </p>
            )}
            <Link
              href="/shop"
              className="relative z-10 mt-3 inline-flex items-center gap-1 text-xs font-semibold text-coin-deep hover:underline"
            >
              Xem cửa hàng <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </section>

          <p className="border-t border-border pt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Polymer · Khám phá · MoneyApp
          </p>
        </aside>
      </div>
    </main>
  )
}
