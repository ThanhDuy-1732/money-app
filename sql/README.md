# SQL Migrations & Triggers

This directory contains SQL migrations and trigger definitions for the money-app backend.

## Execution Order

All migrations must be executed against Supabase in this order:

1. **schema.sql** (already committed) — Base schema with tables and core functions
2. **triggers/01-signup-bonus.sql** (Sprint 0) — Signup bonus trigger (50 pts)
3. **triggers/02-profile-complete.sql** (Sprint 1) — Profile complete bonus trigger (20 pts)
4. **triggers/03-post-bonus.sql** (Sprint 2) — Post bonus trigger (10 pts, max 3/day) + referral completion
5. **triggers/04-login-streak.sql** (Sprint 3) — Login streak trigger (5 pts/day + milestone bonus)
6. **storage/05-storage-policies.sql** (Sprint 1) — Storage bucket policies for avatars and post images

## Trigger Details

### T1: Signup Bonus (01-signup-bonus.sql)
- **Event**: AFTER INSERT on `public.profiles`
- **Reward**: 50 points for account creation
- **Idempotency**: Automatic (fires once per profile)

### T2: Profile Complete (02-profile-complete.sql)
- **Event**: AFTER UPDATE on `public.profiles`
- **Reward**: 20 points when both avatar_url AND bio are filled
- **Idempotency**: Checks `points_ledger` to ensure single reward

### T3: Post Bonus (03-post-bonus.sql)
- **Event**: AFTER INSERT on `public.posts`
- **Reward**: 10 points per post (max 3 posts per day)
- **Bonus**: Completes referral on first post ever
- **Daily limit**: Enforced via COUNT query over current day

### T4: Login Streak (04-login-streak.sql)
- **Event**: BEFORE UPDATE on `public.profiles` (last_login_date)
- **Reward**: 5 points daily + random bonus (10-100 pts) at milestones (7, 14, 30, 60, 100 days)
- **Logic**:
  - Same day login: skip
  - Yesterday → today: increment streak, +5 pts
  - Gap > 1 day: reset to 1, +5 pts
- **Note**: BEFORE trigger allows direct modification of NEW.streak_count

### T5: Storage Policies (05-storage-policies.sql)
- **Buckets**: `avatars`, `post-images` (both public)
- **Insert Policy**: Authenticated users can only upload to their own user_id/ folder
- **Select Policy**: Public read access to all objects
- **Path format**: Files must be stored as `{user_id}/{filename}`

## Key Constraints

- All functions have `SECURITY DEFINER SET search_path = public`
- All triggers use idempotent logic to prevent duplicate rewards
- Storage policies use `storage.foldername(name)[1]` to extract user_id from path

## Testing

Each task brief includes SQL test queries to validate trigger behavior:
- Verify trigger existence in `information_schema.triggers`
- Test award logic (correct points, no duplicates)
- Test daily limits (post max 3/day)
- Test streak reset behavior
- Test milestone bonuses
