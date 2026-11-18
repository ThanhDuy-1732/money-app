'use client'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/vi'
import { MessageCircle } from 'lucide-react'
import { Avatar, Card, CardBody } from '@/components/ui'
import { LikeButton } from './LikeButton'
import { CommentList } from './CommentList'
import { CommentInput } from './CommentInput'
import type { Database } from '@/lib/types/database'

dayjs.extend(relativeTime)
dayjs.locale('vi')

type Post = Database['public']['Tables']['posts']['Row'] & {
  profiles: { display_name: string; avatar_url: string | null }
  comments: Array<
    Database['public']['Tables']['comments']['Row'] & {
      profiles: { display_name: string; avatar_url: string | null }
    }
  >
  user_liked?: boolean
}

export function PostCard({ post, currentUserId }: { post: Post; currentUserId?: string }) {
  const images = (post.image_urls as unknown as string[]) ?? []

  return (
    <Card>
      <CardBody className="space-y-3 pt-4">
        <div className="flex items-center gap-3">
          <Avatar src={post.profiles.avatar_url} fallback={post.profiles.display_name} />
          <div>
            <p className="text-sm font-semibold">{post.profiles.display_name}</p>
            <p className="text-xs text-muted-foreground">{dayjs(post.created_at).fromNow()}</p>
          </div>
        </div>

        {post.content && <p className="text-sm text-foreground">{post.content}</p>}

        {images.length > 0 && (
          <div className="grid grid-cols-2 gap-1">
            {images.map(url => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt=""
                loading="lazy"
                className="aspect-square w-full rounded-md object-cover"
              />
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 border-t border-border pt-2">
          <LikeButton
            postId={post.id}
            initialCount={post.like_count}
            initialLiked={post.user_liked ?? false}
          />
          <span
            data-icon="message-circle"
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground"
          >
            <MessageCircle className="h-4 w-4" />
            {post.comment_count}
          </span>
        </div>

        <CommentList comments={post.comments} />
        {currentUserId && <CommentInput postId={post.id} />}
      </CardBody>
    </Card>
  )
}
