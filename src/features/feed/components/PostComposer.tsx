'use client'
import { useEffect, useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createPost } from '../actions/feed.actions'
import {
  Avatar,
  Button,
  Card,
  Guilloche,
  Textarea,
  Toast,
  useToast,
  WatermarkCoin,
} from '@/components/ui'
import { cn } from '@/lib/cn'

const MAX_IMAGES = 4
const MAX_LENGTH = 500

export function PostComposer({
  userId,
  displayName,
  avatarUrl,
  demo = false,
}: {
  userId: string
  displayName: string
  avatarUrl: string | null
  demo?: boolean
}) {
  const [content, setContent] = useState('')
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [posting, setPosting] = useState(false)
  const [justPosted, setJustPosted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const toast = useToast()

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`
  }, [content])

  function flashPosted() {
    setJustPosted(true)
    setTimeout(() => setJustPosted(false), 1000)
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (imageUrls.length + files.length > MAX_IMAGES) {
      setError(`Tối đa ${MAX_IMAGES} ảnh`)
      return
    }

    setUploading(true)
    setError(null)
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
    if (posting) return
    setError(null)
    setPosting(true)
    if (demo) {
      await new Promise(resolve => setTimeout(resolve, 550))
      setPosting(false)
      setContent('')
      setImageUrls([])
      flashPosted()
      toast.show({
        title: 'Đã đăng bài',
        description: 'Bài viết của bạn đã xuất hiện trên bảng tin.',
        variant: 'success',
      })
      return
    }
    const result = await createPost({ content, image_urls: imageUrls })
    setPosting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setContent('')
    setImageUrls([])
    flashPosted()
    toast.show({
      title: 'Đã đăng bài',
      description: 'Bài viết của bạn đã xuất hiện trên bảng tin.',
      variant: 'success',
    })
  }

  const disabled = posting || uploading || (content.trim().length === 0 && imageUrls.length === 0)
  const nearLimit = content.length >= MAX_LENGTH - 50

  return (
    <>
      <Card
        className={cn(
          'relative isolate overflow-hidden border-primary/25 bg-secondary transition-[border-color,box-shadow] duration-300 focus-within:border-primary/60',
          justPosted && 'ring-2 ring-primary/35'
        )}
      >
        <Guilloche className="text-primary" opacity={0.05} />
        <WatermarkCoin className="-bottom-12 -right-4" size={160} opacity={0.06} />
        <form onSubmit={handleSubmit} className="relative z-10">
          <div className="flex gap-3 px-4 pt-4">
            <Avatar
              src={avatarUrl}
              fallback={displayName}
              className="mt-0.5 ring-2 ring-card"
            />
            <Textarea
              ref={textareaRef}
              placeholder="Bạn đang nghĩ gì?"
              aria-label="Nội dung bài viết"
              maxLength={MAX_LENGTH}
              rows={2}
              value={content}
              onChange={e => setContent(e.target.value)}
              onKeyDown={e => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault()
                  e.currentTarget.form?.requestSubmit()
                }
              }}
              className="min-h-[56px] resize-none border-0 bg-transparent px-0 py-0 text-body shadow-none placeholder:text-secondary-foreground/50 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0"
            />
          </div>

          {imageUrls.length > 0 && (
            <div className="flex flex-wrap gap-2 px-4 pt-3">
              {imageUrls.map(url => (
                <div key={url} className="group relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="h-20 w-20 rounded-lg border border-primary/15 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setImageUrls(urls => urls.filter(item => item !== url))}
                    aria-label="Xoá ảnh"
                    className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sheet transition-colors hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && (
            <p
              role="alert"
              className="mx-4 mt-3 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive"
            >
              {error}
            </p>
          )}

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-primary/15 px-4 py-2.5">
            <div className="flex items-center gap-3">
              <label
                className={cn(
                  'inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-semibold transition-colors',
                  imageUrls.length >= MAX_IMAGES
                    ? 'cursor-not-allowed text-secondary-foreground/40'
                    : 'text-secondary-foreground/70 hover:bg-primary/10 hover:text-primary'
                )}
              >
                <ImagePlus className={cn('h-4 w-4', uploading && 'animate-pulse')} />
                {uploading ? 'Đang tải…' : `${imageUrls.length}/${MAX_IMAGES}`}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={imageUrls.length >= MAX_IMAGES || uploading}
                />
              </label>
              <span
                className={cn(
                  'text-[11px] font-semibold tabular',
                  nearLimit ? 'text-destructive' : 'text-secondary-foreground/50'
                )}
              >
                {content.length}/{MAX_LENGTH}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-[10px] font-semibold text-secondary-foreground/40 sm:block">
                ⌘↵ để đăng
              </span>
              <Button type="submit" size="sm" loading={posting} disabled={disabled}>
                Đăng
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {toast.message && (
        <Toast
          open={toast.open}
          onOpenChange={toast.setOpen}
          title={toast.message.title}
          description={toast.message.description}
          variant={toast.message.variant}
        />
      )}
    </>
  )
}
