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
        Insert: {
          id: string
          display_name: string
          bio?: string | null
          avatar_url?: string | null
          points_balance?: number
          streak_count?: number
          last_login_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          bio?: string | null
          avatar_url?: string | null
          points_balance?: number
          streak_count?: number
          last_login_date?: string | null
          created_at?: string
        }
        Relationships: []
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
        Insert: {
          id?: string
          user_id: string
          content?: string | null
          image_urls?: Json
          like_count?: number
          comment_count?: number
          deleted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content?: string | null
          image_urls?: Json
          like_count?: number
          comment_count?: number
          deleted_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          id: string
          post_id: string
          user_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          content?: string
          created_at?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          post_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          post_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          post_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          follower_id?: string
          following_id?: string
          created_at?: string
        }
        Relationships: []
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
        Insert: {
          id?: string
          user_id: string
          delta: number
          reason_code: string
          ref_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          delta?: number
          reason_code?: string
          ref_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      rewards: {
        Row: {
          id: string
          name: string
          description: string | null
          points_cost: number
          active: boolean
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          points_cost: number
          active?: boolean
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          points_cost?: number
          active?: boolean
        }
        Relationships: []
      }
      referrals: {
        Row: {
          id: string
          referrer_id: string
          referred_id: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          referrer_id: string
          referred_id: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          referrer_id?: string
          referred_id?: string
          status?: string
          created_at?: string
        }
        Relationships: []
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
        Insert: {
          id?: string
          user_id: string
          type: string
          payload?: Json | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          payload?: Json | null
          read_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          user_id: string
          amount_vnd: number
          gateway: 'payos' | 'vnpay' | 'momo'
          gateway_txn_id: string | null
          status: 'pending' | 'succeeded' | 'failed'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount_vnd: number
          gateway: 'payos' | 'vnpay' | 'momo'
          gateway_txn_id?: string | null
          status?: 'pending' | 'succeeded' | 'failed'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount_vnd?: number
          gateway?: 'payos' | 'vnpay' | 'momo'
          gateway_txn_id?: string | null
          status?: 'pending' | 'succeeded' | 'failed'
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}
