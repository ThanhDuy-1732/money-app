import { listPosts, hidePost, unhidePost } from '@/features/admin/actions/moderation.actions'
import { ConfirmAction } from '@/components/ConfirmAction'
import { Badge, Card, CardBody, EmptyState, Section } from '@/components/ui'

export default async function AdminPostsPage() {
  const posts = await listPosts()

  return (
    <div data-testid="admin-posts" className="space-y-4">
      <Section title={`Bài đăng (${posts.length})`}>
        {posts.length === 0 ? (
          <EmptyState title="Chưa có bài đăng" description="Bài đăng sẽ xuất hiện ở đây." />
        ) : (
          <div className="space-y-2">
            {posts.map(post => (
              <Card key={post.id} className={post.hidden ? 'opacity-60' : ''}>
                <CardBody className="flex items-start justify-between gap-4 pt-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">
                      {(post.profiles as { display_name: string } | null)?.display_name} ·{' '}
                      {new Date(post.created_at).toLocaleString('vi-VN')}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm">{post.content}</p>
                    {post.hidden && (
                      <Badge variant="lotus" className="mt-2">
                        Đã ẩn
                      </Badge>
                    )}
                  </div>
                  <ConfirmAction
                    trigger={post.hidden ? 'Hiện lại' : 'Ẩn bài'}
                    title={post.hidden ? 'Hiện lại bài đăng?' : 'Ẩn bài đăng?'}
                    description={
                      post.hidden
                        ? 'Bài đăng sẽ hiển thị lại trong feed.'
                        : 'Bài đăng sẽ bị ẩn khỏi feed và trang cá nhân.'
                    }
                    confirmLabel={post.hidden ? 'Hiện lại' : 'Ẩn bài'}
                    action={
                      post.hidden
                        ? unhidePost.bind(null, post.id)
                        : hidePost.bind(null, post.id)
                    }
                    variant={post.hidden ? 'outline' : 'destructive'}
                  />
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}
