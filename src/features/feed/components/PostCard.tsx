'use client'
import Link from 'next/link'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/vi'
import { Avatar } from '@/components/ui'
import { LikeButton } from './LikeButton'
import { CommentList } from './CommentList'
import { CommentInput } from './CommentInput'
import type { Database } from '@/lib/types/database'
dayjs.extend(relativeTime)
dayjs.locale('vi')

export type PostCardPost = Database['public']['Tables']['posts']['Row'] & {
  profiles: { display_name: string; avatar_url: string | null }
  comments: Array<Database['public']['Tables']['comments']['Row'] & {
    profiles: { display_name: string; avatar_url: string | null }
  }>
  user_liked?: boolean
  tags?: string[] | null
}

export function PostCard({ post, currentUserId }: { post: PostCardPost; currentUserId?: string }) {
  const images = post.image_urls as string[]
  return (
    <article className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Avatar src={post.profiles.avatar_url} fallback={post.profiles.display_name} />
        <div>
          <p className="font-medium text-sm">{post.profiles.display_name}</p>
          <p className="text-xs text-gray-400">{dayjs(post.created_at).fromNow()}</p>
        </div>
      </div>
      {post.content && <p className="text-sm text-gray-800">{post.content}</p>}
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {post.tags.map(tag => (
            <Link
              key={tag}
              href={`/explore/tag/${encodeURIComponent(tag)}`}
              className="text-xs text-blue-600 hover:underline"
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-1">
          {images.map(url => <img key={url} src={url} alt="" className="rounded object-cover w-full aspect-square" />)}
        </div>
      )}
      <div className="flex gap-2">
        <LikeButton postId={post.id} initialCount={post.like_count} initialLiked={post.user_liked ?? false} />
        <span className="text-sm text-gray-500 self-center">💬 {post.comment_count}</span>
      </div>
      <CommentList comments={post.comments ?? []} />
      {currentUserId && <CommentInput postId={post.id} />}
    </article>
  )
}
