'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BalanceCard } from './BalanceCard'
import { getBalance } from '../actions/wallet.actions'

export function RealtimeBalance({
  userId,
  initialBalance,
  streak,
}: {
  userId: string
  initialBalance: number
  streak: number
}) {
  const [balance, setBalance] = useState(initialBalance)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('wallet-balance')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'points_ledger',
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          const fresh = await getBalance()
          setBalance(fresh)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  return <BalanceCard balance={balance} streak={streak} userId={userId} />
}
