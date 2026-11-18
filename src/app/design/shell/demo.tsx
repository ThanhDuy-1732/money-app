'use client'
import { AppNav } from '@/components/AppNav'

export function AppNavDemo() {
  return (
    <AppNav
      balance={1250}
      streak={7}
      isAdmin={false}
      signOutAction={() => {}}
      unreadCount={3}
    />
  )
}
