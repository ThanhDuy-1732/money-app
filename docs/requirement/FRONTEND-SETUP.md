# Frontend — Khởi tạo dự án (Giai đoạn 1)

Tài liệu này hướng dẫn dựng khung frontend cho MVP Social + Fintech (điểm thưởng), tương ứng Sprint 0 trong tài liệu *Kế hoạch Giai đoạn 1*. Chi tiết luồng/quy tắc từng màn hình xem tại tài liệu *Đặc tả thiết kế tính năng Giai đoạn 1*; cấu trúc bảng dữ liệu xem tại *Đặc tả thiết kế Database*.

## 1. Yêu cầu môi trường

- Node.js 20 LTS trở lên
- npm (đi kèm Node) hoặc pnpm
- Tài khoản Supabase đã tạo project (xem file `BACKEND-SETUP.md`)

## 2. Khởi tạo dự án

```bash
npx create-next-app@latest ten-du-an \
  --typescript --tailwind --eslint --app --src-dir

cd ten-du-an
npm install @supabase/supabase-js @supabase/ssr
npm install react-hook-form zod @hookform/resolvers
npm install dayjs
```

Giải thích lựa chọn thư viện: `@supabase/ssr` để dùng Supabase đúng cách với Next.js App Router (server components + client components); `react-hook-form` + `zod` để validate form đăng ký/đăng bài theo đúng ràng buộc đã định nghĩa (vd: bio ≤ 160 ký tự, bài đăng ≤ 500 ký tự); `dayjs` để hiển thị thời gian tương đối (vd: "5 phút trước") trên feed.

## 3. Biến môi trường (`.env.local`)

| Biến | Lấy ở đâu | Ghi chú |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | Public, an toàn để lộ ra client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API | Public, RLS đã chặn truy cập trái phép |
| `NEXT_PUBLIC_SITE_URL` | Tự đặt (vd: `http://localhost:3000`) | Dùng cho redirect URL sau OTP/Google login |

Không đặt `SUPABASE_SERVICE_ROLE_KEY` ở frontend — key này chỉ dùng ở backend/Edge Function (xem `BACKEND-SETUP.md`).

## 4. Kết nối Supabase

`src/lib/supabase/client.ts` (dùng trong Client Component):

```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

`src/lib/supabase/server.ts` (dùng trong Server Component/Server Action — xem tài liệu chính thức `@supabase/ssr` để lấy đúng bản xử lý cookie mới nhất, vì API này cập nhật khá thường xuyên).

## 5. Sinh TypeScript types từ database

Sau khi đã chạy `schema.sql` trên Supabase (xem `BACKEND-SETUP.md`):

```bash
npx supabase login
npx supabase gen types typescript --project-id <PROJECT_ID> > src/lib/types/database.ts
```

Chạy lại lệnh này mỗi khi schema thay đổi để type luôn khớp với database thật.

## 6. Cấu trúc thư mục đề xuất

Bám theo đúng sitemap trong tài liệu Đặc tả tính năng:

```
src/
  app/
    (auth)/
      dang-ky/page.tsx
      dang-nhap/page.tsx
    feed/page.tsx
    ho-so/page.tsx              # hồ sơ của chính mình
    u/[username]/page.tsx       # hồ sơ công khai người khác
    vi/page.tsx                 # ví điểm thưởng
    moi-ban/page.tsx
    doi-diem/page.tsx
    kham-pha/page.tsx
    thong-bao/page.tsx
  components/
    ui/            # button, input, avatar, badge — dùng chung
    post/           # post-card, post-composer, like-button, comment-list
    wallet/         # balance-card, ledger-row
  lib/
    supabase/       # client.ts, server.ts
    types/          # database.ts (sinh tự động)
    validators/     # schema zod cho từng form (theo bảng "Trường dữ liệu & validation")
```

## 7. Thứ tự dựng màn hình theo sprint

Bám đúng thứ tự trong *Kế hoạch Giai đoạn 1* để tránh làm tràn lan:

1. **Sprint 1** — F1 (Đăng ký/Đăng nhập), F2 (Hồ sơ cá nhân)
2. **Sprint 2** — F3 (Feed & Đăng bài)
3. **Sprint 3** — F4 (Follow), F6 phần mời bạn (trang `/moi-ban` + landing giới thiệu)
4. **Sprint 4** — F5 (Ví điểm thưởng — chỉ hiển thị, số liệu đọc qua `points_ledger`)
5. **Sprint 5** — F7 (Đổi điểm — gọi RPC `redeem_reward`), tích hợp nạp tiền
6. **Sprint 6** — F8 (Thông báo), closed beta

Mỗi màn hình: đọc đúng mục tương ứng (F1–F8) trong *Đặc tả thiết kế tính năng* trước khi code — tài liệu đó đã có sẵn luồng, quy tắc nghiệp vụ, validation và tiêu chí hoàn thành, không cần đoán thêm.

## 8. Lưu ý khi gọi các thao tác liên quan đến điểm thưởng

Chỉ gọi RPC `redeem_reward` trực tiếp từ frontend (đã an toàn vì tự kiểm tra `auth.uid()` ở tầng database):

```ts
const { data, error } = await supabase.rpc('redeem_reward', {
  p_reward_id: rewardId,
})
```

**Không** gọi `add_points` hoặc `complete_referral` trực tiếp từ frontend — hai hàm này chỉ được phép chạy từ phía backend đáng tin cậy. Chi tiết lý do và cách khóa quyền xem mục bảo mật trong `BACKEND-SETUP.md`.

## 9. Thiết kế tham khảo (Figma)

[Social App - Free UI Kit](https://www.figma.com/community/file/1074560321292383928/social-app-free-ui-kit) — dùng làm khung tham khảo cho layout feed, hồ sơ, và bố cục thẻ bài đăng. Khi dựng UI, đơn giản hóa lại đúng theo 8 màn hình trong sitemap (bỏ các màn hình kit có sẵn nhưng không nằm trong phạm vi Giai đoạn 1 như DM, groups, stories).

## 10. Checklist ngay hôm nay

- [ ] Khởi tạo dự án Next.js theo bước 2
- [ ] Điền `.env.local` sau khi đã tạo xong Supabase project (song song với `BACKEND-SETUP.md`)
- [ ] Kết nối thử: fetch 1 dòng từ bảng `rewards` để xác nhận client-server thông suốt
- [ ] Dựng trang `/dang-ky` cơ bản theo đúng luồng F1
