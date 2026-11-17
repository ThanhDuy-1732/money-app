import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/types/database'
import { SUPABASE_KEY, SUPABASE_URL } from '@/lib/supabase/env'

export function createClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_KEY)
}
