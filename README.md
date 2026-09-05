# Money App

Ứng dụng quản lý tài chính cá nhân + mạng xã hội. Xây dựng bằng Next.js 15 (App Router) + Supabase (Auth, PostgreSQL, Storage, Realtime).

## Yêu cầu

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — phải đang chạy
- Node.js 18+ và npm

## Khởi động (lần đầu)

```bash
./scripts/dev.sh
```

Script tự động làm tất cả:

1. Tạo `.env` từ `.env.example` (nếu chưa có)
2. Cập nhật `.env.local` với đúng endpoint local
3. Kéo Docker images và khởi động toàn bộ backend (DB, Auth, API, Storage, Studio)
4. Chờ PostgreSQL healthy
5. Chạy toàn bộ database migrations
6. Khởi động Next.js dev server

Sau khi lên:

| URL | Dịch vụ |
|-----|---------|
| http://localhost:3000 | Ứng dụng |
| http://localhost:3001 | Supabase Studio (quản lý DB) |
| http://localhost:9000 | Inbucket (xem OTP email) |

## Các lần chạy tiếp theo

Database đã có data, bỏ qua migrations:

```bash
./scripts/dev.sh --no-migrate
```

## Tắt backend

```bash
./scripts/dev.sh --down
```

Data được lưu trong Docker volumes — không mất khi tắt.

## Cấu hình môi trường

### `.env` — Docker Compose (backend)

Tạo tự động từ `.env.example`. Các giá trị mặc định hoạt động ngay cho local dev, không cần thay đổi.

### `.env.local` — Next.js (frontend)

Tạo tự động bởi script. Để override (ví dụ: thêm VNPay credentials thật):

```bash
# Thêm vào .env.local
VNPAY_TMN_CODE=your_code
VNPAY_HASH_SECRET=your_secret
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
# Bỏ dòng VNPAY_MOCK=1
```

## Đăng nhập local

Dùng Magic Link hoặc OTP qua email. Vì đây là môi trường local, email được bắt bởi Inbucket tại http://localhost:9000 — không cần email thật.

## Database migrations

Chạy thủ công nếu cần (ví dụ: sau khi thêm migration mới):

```bash
DB_PORT=5432 ./scripts/migrate.sh
```

## Stack kỹ thuật

| Thành phần | Công nghệ |
|---|---|
| Frontend | Next.js 15 (App Router, Server Actions) |
| Backend | Supabase (Auth, PostgreSQL, Storage, Realtime) |
| Styling | Tailwind CSS |
| Validation | Zod |
| Payment | VNPay (mock gateway cho local — `VNPAY_MOCK=1`) |
| Language | TypeScript |
