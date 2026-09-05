import { listPosts, hidePost, unhidePost } from '@/features/admin/actions/moderation.actions'

export default async function AdminPostsPage() {
  const posts = await listPosts()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Bài đăng ({posts.length})</h1>
      <div className="space-y-2">
        {posts.map(p => (
          <div key={p.id} className={`border rounded-xl p-4 flex justify-between items-start gap-4 ${p.hidden ? 'opacity-50' : ''}`}>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 mb-1">{(p.profiles as any)?.display_name} · {new Date(p.created_at).toLocaleString('vi-VN')}</p>
              <p className="text-sm line-clamp-2">{p.content}</p>
            </div>
            <form action={p.hidden ? unhidePost.bind(null, p.id) : hidePost.bind(null, p.id)}>
              <button className="text-xs text-red-600 hover:underline shrink-0">
                {p.hidden ? 'Hiện lại' : 'Ẩn bài'}
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  )
}
