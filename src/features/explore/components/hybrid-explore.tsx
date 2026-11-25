import {
  ExploreHero,
  ExploreSearch,
  PeopleRail,
  RewardsRail,
  StreakLeaderboard,
  TopicStrip,
} from './rails-parts'
import {
  FeatureTile,
  HighlightTile,
  StreakTile,
  TopicsTile,
  TrendingTile,
} from './bento-parts'
import type { ExploreData } from '../types'

export function HybridExplore({
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
  const topLeader = leaders[0]
  const highlight = rewards[0]

  return (
    <main className="mx-auto max-w-default px-4 pb-16 pt-6">
      <ExploreHero stats={stats} />
      <ExploreSearch q={q} />
      <TopicStrip topics={topics} />

      <div className="mt-6 grid gap-3 md:grid-cols-6">
        {featured && <FeatureTile post={featured} />}
        <div className="grid content-start gap-3 md:col-span-2">
          {topLeader && <StreakTile leader={topLeader} />}
          {highlight && <HighlightTile reward={highlight} />}
        </div>
        <TrendingTile posts={posts} className="md:col-span-4" />
        <TopicsTile topics={topics} />
      </div>

      <PeopleRail people={people} demo={demo} signedIn={signedIn} />
      <RewardsRail rewards={rewards} />
      <StreakLeaderboard leaders={leaders} />
    </main>
  )
}
