'use client'
import { useState } from 'react'
import { ImagePlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createPost } from '../actions/feed.actions'
import { Button, Card, CardBody, Textarea } from '@/components/ui'

export function PostComposer({ userId }: { userId: string }) {
  const [content, setContent] = useState('')
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (imageUrls.length + files.length > 4) {
      setError('Tối đa 4 ảnh')
      return
    }

    setUploading(true)
    const supabase = createClient()
    const uploaded: string[] = []

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Mỗi ảnh tối đa 10MB')
        continue
      }
      const ALLOWED_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif'])
      const raw = file.name.split('.').pop()?.toLowerCase() ?? ''
      const ext = ALLOWED_EXTS.has(raw) ? raw : 'jpg'
      const path = `${userId}/${Date.now()}.${ext}`
      const { error: err } = await supabase.storage.from('post-images').upload(path, file)
      if (err) {
        setError(err.message)
        continue
      }
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
    if (result.error) {
      setError(result.error)
      return
    }
    setContent('')
    setImageUrls([])
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardBody className="space-y-3 pt-4">
        <Textarea
          placeholder="Bạn đang nghĩ gì?"
          maxLength={500}
          value={content}
          onChange={e => setContent(e.target.value)}
          className="min-h-20 resize-none border-0 bg-transparent p-0"
        />

        {imageUrls.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {imageUrls.map(url => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} alt="" className="h-20 w-20 rounded-md object-cover" />
            ))}
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive"
          >
            {error}
          </p>
        )}

        <div className="flex items-center justify-between border-t border-border pt-3">
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
            <ImagePlus className="h-4 w-4" />
            {imageUrls.length}/4
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
              disabled={imageUrls.length >= 4}
            />
          </label>
          <Button
            type="submit"
            size="sm"
            disabled={uploading || (content.trim().length === 0 && imageUrls.length === 0)}
          >
            Đăng
          </Button>
        </div>
        </CardBody>
      </form>
    </Card>
  )
}
