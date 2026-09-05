/**
 * Escapes LIKE metacharacters (%, _, \) so user input is treated as literal text.
 * Use this before passing user input to `.ilike()` or any LIKE-pattern query.
 */
export function escapeLike(q: string): string {
  return q.replace(/[%_\\]/g, '\\$&')
}
