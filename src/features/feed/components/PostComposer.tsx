'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createPost } from '../actions/feed.actions'
import { Button } from '@/components/ui'

export function PostComposer({ userId }: { userId: string }) {
  const [content, setContent] = useState('')
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (imageUrls.length + files.length > 4) { setError('Tối đa 4 ảnh'); return }

    setUploading(true)
    const supabase = createClient()
    const uploaded: string[] = []

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) { setError('Mỗi ảnh tối đa 10MB'); continue }
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${userId}/${Date.now()}.${ext}`
      const { error: err } = await supabase.storage.from('post-images').upload(path, file)
      if (err) { setError(err.message); continue }
      const { data } = supabase.storage.from('post-images').getPublicUrl(path)
      uploaded.push(data.publicUrl)
    }

    setImageUrls(prev => [...prev, ...uploaded])
    setUploading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const result = await createPost({ content, image_urls: imageUrls })
    if (result.error) { setError(result.error); return }
    setContent('')
    setImageUrls([])
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-3">
      <textarea
        placeholder="Bạn đang nghĩ gì?"
        maxLength={500}
        value={content}
        onChange={e => setContent(e.target.value)}
        className="w-full min-h-[80px] resize-none border-0 focus:outline-none text-sm"
      />
      {imageUrls.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {imageUrls.map(url => (
            <img key={url} src={url} alt="" className="h-20 w-20 object-cover rounded" />
          ))}
        </div>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
          📷 {imageUrls.length}/4
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={imageUrls.length >= 4} />
        </label>
        <Button type="submit" size="sm" disabled={uploading || (content.trim().length === 0 && imageUrls.length === 0)}>
          Đăng
        </Button>
      </div>
    </form>
  )
}
