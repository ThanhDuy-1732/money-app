'use client'
import { createClient } from '@/lib/supabase/client'
import { useState, useRef } from 'react'
import { Avatar } from '@/components/ui'

export function AvatarUpload({ userId, currentUrl }: { userId: string; currentUrl?: string | null }) {
  const [url, setUrl] = useState(currentUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Ảnh tối đa 5MB'); return }

    setUploading(true)
    setError(null)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${userId}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (uploadError) { setError(uploadError.message); setUploading(false); return }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    setUrl(data.publicUrl)

    await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', userId)
    setUploading(false)
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}>
        <Avatar src={url} fallback="Avatar" className="h-20 w-20 cursor-pointer hover:opacity-80" />
      </button>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleUpload} />
      {uploading && <p className="text-xs text-gray-500">Đang upload...</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
