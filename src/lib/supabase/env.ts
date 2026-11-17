export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

// Supabase mới dùng publishable key; fallback về anon key cho project cũ.
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
