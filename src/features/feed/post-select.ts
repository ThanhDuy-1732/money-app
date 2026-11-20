/**
 * `posts` and `profiles` have two relationships, so PostgREST needs the FK
 * name to resolve the embed: posts.user_id -> profiles.id is the author,
 * while likes.post_id + likes.user_id is the like relation.
 */
export const POST_AUTHOR_EMBED = 'profiles!posts_user_id_fkey(display_name, avatar_url)'
