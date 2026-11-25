export type ExploreAuthor = {
  display_name: string
  avatar_url: string | null
}

export type ExplorePost = {
  id: string
  content: string | null
  timeLabel: string
  likeCount: number
  commentCount: number
  topic?: string
  author: ExploreAuthor
}

export type ExplorePerson = {
  id: string
  display_name: string
  username: string | null
  avatar_url: string | null
  streak_count: number
  points_balance: number
  isFollowing?: boolean
}

export type ExploreReward = {
  id: string
  title: string
  pricePoints: number
  partnerName?: string | null
  imageUrl?: string | null
}

export type ExploreTopic = {
  label: string
  query: string
}

export type ExploreLeader = {
  id: string
  display_name: string
  avatar_url: string | null
  streak_count: number
}

export type ExploreStats = {
  members: number
  postsToday: number
  streakToday: number
}

export type ExploreData = {
  featured: ExplorePost | null
  posts: ExplorePost[]
  people: ExplorePerson[]
  rewards: ExploreReward[]
  topics: ExploreTopic[]
  leaders: ExploreLeader[]
  stats: ExploreStats
}

export type SearchResults = {
  posts: ExplorePost[]
  users: ExplorePerson[]
}
