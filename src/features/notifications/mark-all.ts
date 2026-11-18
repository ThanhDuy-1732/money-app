export function markAllRead<T extends { read_at: string | null }>(items: T[]): T[] {
  const now = new Date().toISOString()
  return items.map(item => (item.read_at ? item : { ...item, read_at: now }))
}
