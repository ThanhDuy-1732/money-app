'use client'
import { createClient } from '@/lib/supabase/client'
import { useState, useRef } from 'react'
import { Camera } from 'lucide-react'
import { Avatar } from '@/components/ui'
import { updateAvatarUrl } from '../actions/profile.actions'

export function AvatarUpload({
  userId,
  currentUrl,
}: {
  userId: string
  currentUrl?: string | null
}) {
  const [url, setUrl] = useState(currentUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('Ảnh tối đa 5MB')
      return
    }

    setUploading(true)
    setError(null)
    const supabase = createClient()
    const ALLOWED_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp'])
    const raw = file.name.split('.').pop()?.toLowerCase() ?? ''
    const ext = ALLOWED_EXTS.has(raw) ? raw : 'jpg'
    const path = `${userId}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    setUrl(data.publicUrl)

    await updateAvatarUrl(data.publicUrl)
    setUploading(false)
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="relative rounded-full"
        aria-label="Đổi ảnh đại diện"
      >
        <Avatar
          src={url}
          fallback="Avatar"
          size="xl"
          className="cursor-pointer ring-4 ring-card transition-opacity hover:opacity-80"
        />
        <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground">
          <Camera className="h-3.5 w-3.5" />
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleUpload}
      />
      {uploading && <p className="text-xs text-muted-foreground">Đang tải ảnh...</p>}
      {error && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
