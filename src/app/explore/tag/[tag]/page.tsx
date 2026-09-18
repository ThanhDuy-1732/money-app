import { searchByTag } from '@/features/search/actions/search.actions'
import { PostCard } from '@/features/feed/components/PostCard'

interface Props {
  params: Promise<{ tag: string }>
}

export default async function TagExplorePage({ params }: Props) {
  const { tag } = await params
  const decoded = decodeURIComponent(tag)
  const posts = await searchByTag(decoded)

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">#{decoded}</h1>
      <p className="text-sm text-zinc-500">{posts.length} bài đăng</p>
      {posts.length === 0 ? (
        <p className="text-zinc-400 text-sm">Chưa có bài đăng nào với hashtag này.</p>
      ) : (
        <div className="space-y-4">
          {posts.map(post => <PostCard key={post.id} post={post} />)}
        </div>
      )}
    </div>
  )
}
