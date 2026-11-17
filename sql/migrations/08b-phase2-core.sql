-- sql/migrations/08b-phase2-core.sql

-- 1. Add payment_type to existing payments table
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS payment_type text NOT NULL DEFAULT 'topup'
  CHECK (payment_type IN ('topup', 'subscription'));

-- 2. Extend points_ledger reason_code constraint
ALTER TABLE public.points_ledger DROP CONSTRAINT IF EXISTS points_ledger_reason_code_check;
ALTER TABLE public.points_ledger ADD CONSTRAINT points_ledger_reason_code_check
  CHECK (reason_code IN (
    'signup', 'profile_complete', 'streak', 'post',
    'referral_in', 'referral_out', 'redeem', 'adjustment',
    'savings_goal_achieved', 'subscription_points', 'topup'
  ));

-- 3. Extend notifications type constraint
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('follow', 'like', 'comment', 'points', 'referral', 'finance', 'todo'));

-- 4. categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  name       text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
  icon       text,
  type       text NOT NULL CHECK (type IN ('income', 'expense')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id),
  type        text NOT NULL CHECK (type IN ('income', 'expense')),
  amount_vnd  integer NOT NULL CHECK (amount_vnd > 0),
  note        text CHECK (note IS NULL OR char_length(note) <= 200),
  occurred_at date NOT NULL DEFAULT current_date,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_month ON public.transactions (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_categories_user ON public.categories (user_id);

-- 7. RLS
ALTER TABLE public.categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select" ON public.categories
  FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "categories_insert" ON public.categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "transactions_select" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "transactions_insert" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions_update" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "transactions_delete" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- 8. GRANT (RLS alone is not enough)
GRANT SELECT, INSERT ON public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;

-- 9. Default categories seed
INSERT INTO public.categories (user_id, name, icon, type) VALUES
  (NULL, 'Ăn uống',   '🍜', 'expense'),
  (NULL, 'Di chuyển', '🚗', 'expense'),
  (NULL, 'Hóa đơn',   '🧾', 'expense'),
  (NULL, 'Giải trí',  '🎮', 'expense'),
  (NULL, 'Lương',     '💰', 'income'),
  (NULL, 'Khác',      '📦', 'expense')
ON CONFLICT DO NOTHING;
