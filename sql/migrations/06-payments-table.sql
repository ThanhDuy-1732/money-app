-- sql/migrations/06-payments-table.sql
-- Bảng payments: ghi nhận giao dịch nạp tiền qua cổng thanh toán bên thứ ba.
-- INSERT/UPDATE chỉ được thực hiện qua Edge Function (service_role) hoặc trigger DB.

create table if not exists public.payments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  amount_vnd      integer not null check (amount_vnd > 0),
  gateway         text not null check (gateway in ('payos', 'vnpay', 'momo')),
  gateway_txn_id  text,
  status          text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  created_at      timestamptz not null default now()
);

create index if not exists idx_payments_user on public.payments (user_id, created_at desc);

-- RLS
alter table public.payments enable row level security;

-- User có thể xem giao dịch của chính mình
drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own" on public.payments
  for select using (auth.uid() = user_id);

-- User có thể INSERT giao dịch pending (webhook sẽ update status).
-- ponytail: đây là trade-off có chủ ý — Server Action tạo row 'pending', webhook
-- xác thực chữ ký VNPay và mới update status. Nếu cần lock hoàn toàn INSERT,
-- tạo thêm Edge Function create-payment chạy với service_role.
drop policy if exists "payments_insert_own" on public.payments;
create policy "payments_insert_own" on public.payments
  for insert with check (auth.uid() = user_id);

-- UPDATE/DELETE chỉ qua service_role (Edge Function payment-webhook)
revoke update, delete on public.payments from authenticated;
