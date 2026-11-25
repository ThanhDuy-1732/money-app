'use client'
import { useState } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/vi'
import { MessageCircle } from 'lucide-react'
import { Avatar, Button, Card, CardBody } from '@/components/ui'
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

export function PostCard({
  post,
  currentUserId,
  demo = false,
}: {
  post: Post
  currentUserId?: string
  demo?: boolean
}) {
  const images = (post.image_urls as unknown as string[]) ?? []
  const inputId = `comment-input-${post.id}`
  const [commentPulse, setCommentPulse] = useState(0)

  return (
    <Card className="transition-colors hover:border-primary/25">
      <CardBody className="space-y-3 pt-4">
        <div className="flex items-center gap-3">
          <Avatar src={post.profiles.avatar_url} fallback={post.profiles.display_name} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{post.profiles.display_name}</p>
            <p className="text-xs text-muted-foreground">{dayjs(post.created_at).fromNow()}</p>
          </div>
        </div>

        {post.content && (
          <p className="whitespace-pre-wrap break-words text-body leading-relaxed text-foreground">
            {post.content}
          </p>
        )}

        {images.length === 1 && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={images[0]}
            alt=""
            loading="lazy"
            className="max-h-[420px] w-full rounded-lg border border-border object-cover"
          />
        )}

        {images.length > 1 && (
          <div className="grid grid-cols-2 gap-1.5">
            {images.map(url => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt=""
                loading="lazy"
                className="aspect-square w-full rounded-lg border border-border object-cover"
              />
            ))}
          </div>
        )}

        <div className="flex items-center gap-1 border-t border-border pt-2">
          <LikeButton
            postId={post.id}
            initialCount={post.like_count}
            initialLiked={post.user_liked ?? false}
            demo={demo}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => document.getElementById(inputId)?.focus()}
            aria-label="Bình luận bài viết"
            className="gap-1.5 rounded-full px-2.5 text-muted-foreground"
          >
            <span data-icon="message-circle" className="inline-flex">
              <MessageCircle className="h-4 w-4" />
            </span>
            <span className="text-xs font-semibold tabular">{post.comment_count}</span>
          </Button>
        </div>

        <div className="relative">
          {commentPulse > 0 && (
            <span key={commentPulse} aria-hidden className="comment-flash-overlay" />
          )}
          <CommentList comments={post.comments} />
        </div>

        {currentUserId && (
          <CommentInput
            postId={post.id}
            inputId={inputId}
            demo={demo}
            onSubmitted={() => setCommentPulse(value => value + 1)}
          />
        )}
      </CardBody>
    </Card>
  )
}
