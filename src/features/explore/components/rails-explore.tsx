import { Gift } from 'lucide-react'
import {
  ExploreHero,
  ExploreSearch,
  PeopleRail,
  PostTile,
  RailHeader,
  RewardsRail,
  StreakLeaderboard,
  TopicStrip,
} from './rails-parts'
import type { ExploreData } from '../types'

export function RailsExplore({
  data,
  q,
  demo = false,
}: {
  data: ExploreData
  q?: string
  demo?: boolean
}) {
  const { featured, posts, people, rewards, topics, leaders, stats } = data

  return (
    <main className="mx-auto max-w-default px-4 pb-16 pt-6">
      <ExploreHero stats={stats} />
      <ExploreSearch q={q} />
      <TopicStrip topics={topics} />

      <PeopleRail people={people} demo={demo} />

      <section className="mt-10">
        <RailHeader
          title="Bài viết đáng đọc"
          hint="Chọn lọc từ cộng đồng trong 7 ngày qua."
          href="/feed"
        />
        {posts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            Chưa có bài viết nào. Hãy là người mở chủ đề đầu tiên.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {posts.map((post, index) => (
              <PostTile key={post.id} post={post} featured={index === 0} />
            ))}
          </div>
        )}
      </section>

      <RewardsRail rewards={rewards} />
      <StreakLeaderboard leaders={leaders} />

      {featured && (
        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <Gift className="h-3.5 w-3.5" /> Nổi bật tuần này: {featured.author.display_name}
        </p>
      )}
    </main>
  )
}
