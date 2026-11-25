import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FlaskConical } from 'lucide-react'
import { FeedMasthead } from '@/features/feed/components/FeedMasthead'
import { PostComposer } from '@/features/feed/components/PostComposer'
import { PostCard } from '@/features/feed/components/PostCard'
import { mockPosts, mockUser } from './mock'

export default function FeedDesignPage() {
  if (process.env.NODE_ENV === 'production') notFound()

  return (
    <div>
      <div className="border-b border-border bg-background/95">
        <div className="mx-auto flex max-w-narrow flex-wrap items-center justify-between gap-2 px-4 py-2.5">
          <p className="flex items-center gap-1.5 text-micro font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
            <FlaskConical className="h-3.5 w-3.5" /> Demo giao diện bảng tin · dữ liệu mẫu
          </p>
          <Link
            href="/feed"
            className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Bảng tin thật
          </Link>
        </div>
      </div>

      <main className="mx-auto max-w-narrow space-y-6 px-4 py-6">
        <FeedMasthead name={mockUser.display_name} streak={mockUser.streak} />
        <PostComposer
          userId={mockUser.id}
          displayName={mockUser.display_name}
          avatarUrl={null}
          demo
        />

        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="text-micro font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Mới nhất
            </h2>
            <span className="h-px flex-1 bg-border" aria-hidden />
          </div>
          <div className="feed-rise space-y-4">
            {mockPosts.map(post => (
              <PostCard key={post.id} post={post} currentUserId={mockUser.id} demo />
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
