// src/lib/constants/limits.ts

export const FREE_LIMITS = {
  budgets: 3,
  savingsGoals: 1,
  notes: 50,
  activeTodos: 20,
} as const

// ponytail: hardcoded, change when founder confirms pricing
export const PREMIUM_POINTS_COST = 500

export function checkFreeLimit(
  feature: keyof typeof FREE_LIMITS,
  currentCount: number
): { allowed: boolean; error?: string } {
  if (currentCount >= FREE_LIMITS[feature]) {
    return { allowed: false, error: `Đã đạt giới hạn ${FREE_LIMITS[feature]} cho gói Free` }
  }
  return { allowed: true }
}
