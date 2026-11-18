'use client'
import { useRouter } from 'next/navigation'
import { useState, useTransition, useRef, useEffect } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui'
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
    if (val.length < 2) {
      setSuggestions([])
      return
    }
    timer.current = setTimeout(
      () => startTransition(async () => setSuggestions(await autocompleteSearch(val))),
      150
    )
  }

  function handleSelect(suggestion: string) {
    setSuggestions([])
    router.push(`/explore?q=${encodeURIComponent(suggestion)}`)
  }

  return (
    <div className="relative flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        name="q"
        defaultValue={defaultValue}
        onChange={handleChange}
        onBlur={() => setTimeout(() => setSuggestions([]), 150)}
        placeholder="Tìm bài viết, người dùng..."
        autoComplete="off"
        className="pl-9"
      />
      {suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-border bg-card shadow-sheet">
          {suggestions.map((suggestion, index) => (
            <li key={index}>
              <button
                type="button"
                className="w-full px-4 py-2 text-left text-sm hover:bg-muted"
                onClick={() => handleSelect(suggestion)}
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
