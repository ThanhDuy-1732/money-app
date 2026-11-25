import type { Database } from '@/lib/types/database'

type Post = Database['public']['Tables']['posts']['Row'] & {
  profiles: { display_name: string; avatar_url: string | null }
  comments: Array<
    Database['public']['Tables']['comments']['Row'] & {
      profiles: { display_name: string; avatar_url: string | null }
    }
  >
  user_liked?: boolean
}

export const mockUser = {
  id: 'demo-user',
  display_name: 'ThankZ',
  streak: 12,
}

const now = Date.now()
const minutesAgo = (minutes: number) => new Date(now - minutes * 60_000).toISOString()

export const mockPosts: Post[] = [
  {
    id: 'demo-post-1',
    user_id: 'demo-user',
    content:
      'Tháng này mình thử quy tắc 50/30/20 lần đầu. Phần khó nhất không phải là tiêu ít hơn, mà là chuyển 20% sang tiết kiệm ngay ngày nhận lương — trước khi kịp nghĩ đến chuyện mua gì.',
    image_urls: [],
    like_count: 24,
    comment_count: 3,
    created_at: minutesAgo(8),
    deleted_at: null,
    hidden: false,
    profiles: { display_name: 'Linh Trần', avatar_url: null },
    comments: [
      {
        id: 'demo-c1',
        post_id: 'demo-post-1',
        user_id: 'u2',
        content: 'Mình cũng vậy, chuyển khoản ngay hôm nhận lương là cách duy nhất hiệu quả.',
        created_at: minutesAgo(6),
        profiles: { display_name: 'Minh Hoàng', avatar_url: null },
      },
      {
        id: 'demo-c2',
        post_id: 'demo-post-1',
        user_id: 'u3',
        content: 'Thử tách sang một tài khoản riêng, không liên kết thẻ chi tiêu.',
        created_at: minutesAgo(5),
        profiles: { display_name: 'Thảo Vy', avatar_url: null },
      },
      {
        id: 'demo-c3',
        post_id: 'demo-post-1',
        user_id: 'u4',
        content: '20% đầu tiên luôn là phần khó nhất, sau đó thành quen.',
        created_at: minutesAgo(2),
        profiles: { display_name: 'Đức Anh', avatar_url: null },
      },
    ],
  },
  {
    id: 'demo-post-2',
    user_id: 'demo-user',
    content:
      'Streak 100 ngày điểm danh. Không giàu lên nhờ 10 điểm mỗi ngày, nhưng mình bắt đầu để ý đến tiền hơn hẳn.',
    image_urls: [],
    like_count: 12,
    comment_count: 0,
    created_at: minutesAgo(95),
    deleted_at: null,
    hidden: false,
    profiles: { display_name: 'Thảo Vy', avatar_url: null },
    comments: [],
  },
  {
    id: 'demo-post-3',
    user_id: 'demo-user',
    content:
      'Mẹo nhỏ: chia lương thành 3 ví ngay khi nhận — chi tiêu, tiết kiệm, đầu tư. Ví chi tiêu cạn thì thôi, không rút từ ví khác.',
    image_urls: [],
    like_count: 7,
    comment_count: 1,
    created_at: minutesAgo(240),
    deleted_at: null,
    hidden: false,
    profiles: { display_name: 'Đức Anh', avatar_url: null },
    comments: [
      {
        id: 'demo-c4',
        post_id: 'demo-post-3',
        user_id: 'u5',
        content: 'Cách này giúp mình không tiêu quá tay mỗi cuối tháng.',
        created_at: minutesAgo(200),
        profiles: { display_name: 'Ngọc Mai', avatar_url: null },
      },
    ],
  },
]
