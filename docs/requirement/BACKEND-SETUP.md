# Backend — Khởi tạo Supabase (Giai đoạn 1)

Kiến trúc Giai đoạn 1 dùng Supabase làm toàn bộ backend (Postgres + Auth + Storage + Edge Functions) — không cần dựng server riêng. Tài liệu này hướng dẫn khởi tạo, tương ứng Sprint 0 trong *Kế hoạch Giai đoạn 1*. Cấu trúc bảng đầy đủ xem tại *Đặc tả thiết kế Database* và file `schema.sql` đã gửi kèm.

## 1. Tạo project Supabase

1. Vào [supabase.com](https://supabase.com) → New Project → chọn region gần Việt Nam nhất (Singapore) để giảm độ trễ.
2. Lưu lại 3 giá trị trong Project Settings → API: `Project URL`, `anon public key`, `service_role key` (key này giữ bí mật tuyệt đối, không đưa vào frontend hay commit lên git).

## 2. Chạy schema đã thiết kế

1. Mở **SQL Editor** trong Supabase Dashboard.
2. Dán toàn bộ nội dung file `schema.sql` (đã gửi ở tài liệu Đặc tả Database) và chạy 1 lần duy nhất, theo đúng thứ tự có sẵn trong file.
3. Xác nhận:

```sql
select * from pg_policies where schemaname = 'public';
select * from public.rewards; -- phải thấy 2 dòng seed mẫu
```

## 3. Bảo mật đã được xử lý sẵn trong schema.sql — hiểu để không vô tình mở lại

Trong lúc soạn hướng dẫn này, phát hiện và đã vá 2 khoảng hở ngay trong `schema.sql` (bản gửi kèm đã có sẵn, không cần bạn làm gì thêm):

- **`add_points` và `complete_referral` nhận `user_id`/`referred_id` làm tham số mà không tự kiểm tra người gọi có phải chính chủ hay không** — nếu client gọi thẳng được 2 hàm này qua `supabase.rpc(...)`, một người dùng có thể tự cộng điểm cho mình. Đã khóa bằng `REVOKE EXECUTE` ở mục 7c trong `schema.sql`; chỉ `redeem_reward` (tự kiểm tra `auth.uid()` bên trong) được phép gọi từ client.
- **RLS chỉ lọc hàng, không tự cấp quyền bảng** — nếu thiếu `GRANT SELECT/INSERT/...` cho `anon`/`authenticated`, mọi câu lệnh sẽ báo lỗi `permission denied for table ...` bất kể policy cho phép gì. Supabase thường tự cấu hình sẵn các GRANT này ở tầng project, nhưng `schema.sql` đã khai báo tường minh ở mục 7b để không phụ thuộc vào mặc định ngầm của nền tảng.

Sau khi chạy `schema.sql`, có thể xác nhận lại bằng:

```sql
select has_function_privilege('authenticated', 'public.add_points(uuid,integer,text,uuid)', 'execute'); -- phải là false
select has_function_privilege('authenticated', 'public.redeem_reward(uuid)', 'execute');                -- phải là true
```

**Lưu ý khi thêm bảng/hàm mới về sau**: nhớ lặp lại 2 nguyên tắc trên — hàm nhận `user_id` làm tham số mà không tự kiểm tra `auth.uid()` thì không được để client gọi trực tiếp; bảng mới cần `GRANT` tường minh, không giả định nền tảng tự lo.

## 4. Việc còn thiếu cần bổ sung trước khi mở public (TODO)

`schema.sql` bản hiện tại mới tự động hóa 2 luồng (đổi điểm, hoàn tất referral). Các mốc điểm còn lại trong bảng *Quy tắc điểm thưởng chi tiết* (đăng ký, hoàn thiện hồ sơ, streak đăng nhập, đăng bài) cần được cộng điểm bằng **trigger nội bộ** (không phải client tự gọi `add_points`), ví dụ:

- Trigger `AFTER INSERT` trên `auth.users` hoặc `profiles` → gọi `add_points(new.id, 50, 'signup')`.
- Trigger `AFTER UPDATE` trên `profiles` khi `avatar_url` và `bio` vừa đủ điều kiện lần đầu → `add_points(..., 20, 'profile_complete')`.
- Trigger `AFTER INSERT` trên `posts` → đếm số bài trong ngày, nếu ≤ 3 thì `add_points(..., 10, 'post')`; đồng thời gọi `complete_referral(new.user_id)` nếu đây là bài đầu tiên (điều kiện hoàn tất referral).

Đây là phần việc kỹ thuật tiếp theo nên làm trước Sprint 4 — có thể nhờ công cụ lập trình AI viết cụ thể dựa trên mô tả này và các reason_code đã định nghĩa sẵn trong `points_ledger`.

## 5. Cấu hình Authentication

Vào **Authentication → Providers**:

- **Email**: bật, chọn chế độ OTP (magic code) thay vì magic link nếu muốn đúng luồng "nhập email → nhận mã 6 số" như đã đặc tả ở F1.
- **Phone**: cần cấu hình thêm nhà cung cấp SMS (Twilio, MessageBird...) — có phí theo tin nhắn, cân nhắc bật sau nếu ngân sách chưa cho phép ở bản đầu.
- **Google**: tạo OAuth Client ID tại Google Cloud Console (loại "Web application"), thêm Authorized redirect URI theo đúng URL Supabase cung cấp sẵn trong mục cấu hình Google, dán Client ID/Secret vào Supabase.

Vào **Authentication → URL Configuration**: khai báo `Site URL` và các `Redirect URLs` khớp với `NEXT_PUBLIC_SITE_URL` ở frontend (cả bản local lẫn domain production sau này).

## 6. Cấu hình Storage

Tạo 2 bucket trong **Storage**:

| Bucket | Public | Dùng cho |
|---|---|---|
| `avatars` | Có | Ảnh đại diện, tối đa 5MB/file (giới hạn ở phía client trước khi upload) |
| `post-images` | Có | Ảnh đính kèm bài đăng, tối đa 4 ảnh/bài |

Thêm policy cho từng bucket (Storage → Policies): cho phép `INSERT` khi `auth.uid()` khớp với thư mục con chứa file (quy ước đặt tên file theo `user_id/...`) để người dùng chỉ upload được vào không gian của chính mình.

## 7. Edge Function cho webhook thanh toán (chuẩn bị cho Sprint 5)

```bash
npx supabase functions new payment-webhook
npx supabase secrets set PAYOS_CHECKSUM_KEY=xxx VNPAY_HASH_SECRET=xxx
```

Logic tối thiểu trong `payment-webhook`: xác thực chữ ký (checksum) từ payOS/VNPay/MoMo → nếu hợp lệ và trạng thái thành công, cập nhật `payments.status = 'succeeded'` rồi gọi `add_points` (Edge Function chạy với `service_role`, có quyền gọi hàm đã bị khóa ở bước 3) để cộng điểm tương ứng số tiền đã nạp.

Deploy: `npx supabase functions deploy payment-webhook`, sau đó cấu hình URL callback này trong dashboard của payOS/VNPay/MoMo.

## 8. Biến môi trường / secrets tổng hợp

| Nơi dùng | Biến | Ghi chú |
|---|---|---|
| Frontend (`.env.local`) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public, an toàn nhờ RLS |
| Edge Function (`supabase secrets`) | `PAYOS_CHECKSUM_KEY`, `VNPAY_HASH_SECRET` | Bí mật, không đưa vào frontend |
| Không dùng ở đâu cả (giữ riêng, chỉ dùng khi cần thao tác admin thủ công) | `SUPABASE_SERVICE_ROLE_KEY` | Toàn quyền, bỏ qua RLS — tuyệt đối không commit lên git |

## 9. Checklist ngay hôm nay

- [ ] Tạo project Supabase, lưu lại 3 key ở bước 1
- [ ] Chạy `schema.sql` (bước 2) và xác nhận bằng 2 câu lệnh kiểm tra
- [ ] Xác nhận lại 2 câu lệnh `has_function_privilege` ở bước 3 (bảo mật đã tự động áp dụng khi chạy schema.sql)
- [ ] Bật Email OTP + Google OAuth (bước 5)
- [ ] Tạo 2 bucket Storage (bước 6)
- [ ] Ghi chú lại TODO ở bước 4 vào backlog Sprint 3–4
