'use client'
import { useRouter } from 'next/navigation'
import { useState, useTransition, useRef, useEffect } from 'react'
import { autocompleteSearch } from '@/features/search/actions/search.actions'

export function SearchInput({ defaultValue = '' }: { defaultValue?: string }) {
  const router = useRouter()
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [, startTransition] = useTransition()
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    clearTimeout(timer.current)
    const val = e.target.value
    if (val.length < 2) { setSuggestions([]); return }
    timer.current = setTimeout(() =>
      startTransition(async () => setSuggestions(await autocompleteSearch(val)))
    , 150)
  }

  function handleSelect(suggestion: string) {
    setSuggestions([])
    router.push(`/explore?q=${encodeURIComponent(suggestion)}`)
  }

  return (
    <div className="relative flex-1">
      <input
        name="q"
        defaultValue={defaultValue}
        onChange={handleChange}
        onBlur={() => setTimeout(() => setSuggestions([]), 150)}
        placeholder="Tìm bài viết, người dùng..."
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        autoComplete="off"
      />
      {suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full rounded-lg border bg-white shadow dark:bg-zinc-900">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                onClick={() => handleSelect(s)}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
