// Stub — regenerate after: npx supabase gen types typescript --local > src/lib/types/database.ts
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          bio: string | null
          avatar_url: string | null
          points_balance: number
          streak_count: number
          last_login_date: string | null
          created_at: string
        }
      }
      posts: {
        Row: {
          id: string
          user_id: string
          content: string | null
          image_urls: Json
          like_count: number
          comment_count: number
          deleted_at: string | null
          created_at: string
        }
      }
      comments: {
        Row: {
          id: string
          post_id: string
          user_id: string
          content: string
          created_at: string
        }
      }
      likes: {
        Row: {
          post_id: string
          user_id: string
          created_at: string
        }
      }
      follows: {
        Row: {
          follower_id: string
          following_id: string
          created_at: string
        }
      }
      points_ledger: {
        Row: {
          id: string
          user_id: string
          delta: number
          reason_code: string
          ref_id: string | null
          created_at: string
        }
      }
      rewards: {
        Row: {
          id: string
          name: string
          description: string | null
          points_cost: number
          active: boolean
        }
      }
      referrals: {
        Row: {
          id: string
          referrer_id: string
          referred_id: string
          status: string
          created_at: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          payload: Json | null
          read_at: string | null
          created_at: string
        }
      }
    }
  }
}
