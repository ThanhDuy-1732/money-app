import type { ExploreData } from '@/features/explore/types'

const LINH = { display_name: 'Linh Trần', avatar_url: null }
const MINH = { display_name: 'Minh Hoàng', avatar_url: null }
const THAO = { display_name: 'Thảo Vy', avatar_url: null }
const DUC = { display_name: 'Đức Anh', avatar_url: null }
const MAI = { display_name: 'Ngọc Mai', avatar_url: null }

export const mockExplore: ExploreData = {
  topics: [
    { label: 'Tiết kiệm', query: 'tiết kiệm' },
    { label: 'Quỹ khẩn cấp', query: 'khẩn cấp' },
    { label: 'Đầu tư', query: 'đầu tư' },
    { label: 'Streak', query: 'streak' },
    { label: 'Trả nợ', query: 'nợ' },
    { label: 'Voucher', query: 'voucher' },
    { label: 'Lương tháng 13', query: 'lương' },
    { label: 'Thói quen', query: 'thói quen' },
  ],
  stats: { members: 1248, postsToday: 37, streakToday: 412 },
  featured: {
    id: 'p1',
    author: LINH,
    timeLabel: '2 giờ trước',
    topic: 'Tiết kiệm',
    likeCount: 128,
    commentCount: 24,
    content:
      'Tháng này mình thử quy tắc 50/30/20 lần đầu. Phần khó nhất không phải là tiêu ít hơn, mà là chuyển 20% sang tiết kiệm ngay ngày nhận lương — trước khi kịp nghĩ đến chuyện mua gì.',
  },
  posts: [
    {
      id: 'p2',
      author: MINH,
      timeLabel: '5 giờ trước',
      topic: 'Quỹ khẩn cấp',
      likeCount: 96,
      commentCount: 18,
      content:
        'Quỹ khẩn cấp 3 tháng chi phí nghe khô khan, nhưng từ lúc có nó mình mới dám từ chối một công việc độc hại. Hoá ra tự do cũng có giá của nó.',
    },
    {
      id: 'p3',
      author: THAO,
      timeLabel: 'Hôm qua',
      topic: 'Streak',
      likeCount: 74,
      commentCount: 12,
      content:
        'Streak 100 ngày điểm danh. Không giàu lên nhờ 10 điểm mỗi ngày, nhưng mình bắt đầu để ý đến tiền hơn hẳn.',
    },
    {
      id: 'p4',
      author: DUC,
      timeLabel: '2 ngày trước',
      topic: 'Thói quen',
      likeCount: 61,
      commentCount: 9,
      content:
        'Mẹo nhỏ: chia lương thành 3 ví ngay khi nhận — chi tiêu, tiết kiệm, đầu tư. Ví chi tiêu cạn thì thôi, không rút từ ví khác.',
    },
    {
      id: 'p5',
      author: MAI,
      timeLabel: '3 ngày trước',
      topic: 'Voucher',
      likeCount: 43,
      commentCount: 6,
      content:
        'Mình vừa đổi 2.000 điểm lấy voucher cà phê. Cảm giác tiêu điểm dễ chịu hơn tiêu tiền thật rất nhiều.',
    },
    {
      id: 'p6',
      author: LINH,
      timeLabel: '4 ngày trước',
      topic: 'Lương tháng 13',
      likeCount: 28,
      commentCount: 3,
      content:
        'Lương tháng 13: 50% trả nợ trước, 30% quỹ khẩn cấp, 20% tự thưởng. Nghe nhàm chán nhưng đây là lần đầu mình không tiêu hết.',
    },
  ],
  people: [
    {
      id: 'u1',
      display_name: 'Linh Trần',
      username: 'linhtran',
      avatar_url: null,
      streak_count: 128,
      points_balance: 12400,
    },
    {
      id: 'u2',
      display_name: 'Minh Hoàng',
      username: 'minhhoang',
      avatar_url: null,
      streak_count: 96,
      points_balance: 9800,
    },
    {
      id: 'u3',
      display_name: 'Thảo Vy',
      username: 'thaovy',
      avatar_url: null,
      streak_count: 74,
      points_balance: 8200,
    },
    {
      id: 'u4',
      display_name: 'Đức Anh',
      username: 'ducanh',
      avatar_url: null,
      streak_count: 61,
      points_balance: 7600,
    },
    {
      id: 'u5',
      display_name: 'Ngọc Mai',
      username: 'ngocmai',
      avatar_url: null,
      streak_count: 45,
      points_balance: 6100,
    },
  ],
  rewards: [
    { id: 'r1', title: 'Voucher cà phê 50k', pricePoints: 2000, partnerName: 'Highlands Coffee' },
    { id: 'r2', title: 'Vé xem phim 2D', pricePoints: 3500, partnerName: 'CGV Cinemas' },
    { id: 'r3', title: 'Mã giảm 30%', pricePoints: 5000, partnerName: 'Shopee' },
    { id: 'r4', title: 'Voucher đi xe 50k', pricePoints: 2500, partnerName: 'Grab' },
  ],
  leaders: [
    { id: 'u1', display_name: 'Linh Trần', avatar_url: null, streak_count: 128 },
    { id: 'u2', display_name: 'Minh Hoàng', avatar_url: null, streak_count: 96 },
    { id: 'u3', display_name: 'Thảo Vy', avatar_url: null, streak_count: 74 },
    { id: 'u4', display_name: 'Đức Anh', avatar_url: null, streak_count: 61 },
    { id: 'u5', display_name: 'Ngọc Mai', avatar_url: null, streak_count: 45 },
  ],
}
