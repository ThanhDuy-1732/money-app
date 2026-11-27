'use client'
import { useEffect, useRef, useState } from 'react'
import { Check, ImagePlus, Maximize2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createPost } from '../actions/feed.actions'
import { EmojiTray, EmojiTrigger } from './EmojiTray'
import {
  Avatar,
  Button,
  Card,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Guilloche,
  Textarea,
  toast,
  WatermarkCoin,
} from '@/components/ui'
import { cn } from '@/lib/cn'

const MAX_IMAGES = 4
const MAX_LENGTH = 500

function ImagePreviews({
  urls,
  onRemove,
  className,
}: {
  urls: string[]
  onRemove: (url: string) => void
  className?: string
}) {
  if (urls.length === 0) return null
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {urls.map(url => (
        <div key={url} className="group relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt=""
            className="h-20 w-20 rounded-lg border border-border object-cover"
          />
          <button
            type="button"
            onClick={() => onRemove(url)}
            aria-label="Xoá ảnh"
            className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sheet transition-colors hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}

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
  const [expanded, setExpanded] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inlineRef = useRef<HTMLTextAreaElement>(null)
  const dialogRef = useRef<HTMLTextAreaElement>(null)
  const inlineTouched = useRef(false)
  const dialogTouched = useRef(false)

  const disabled = posting || uploading || (content.trim().length === 0 && imageUrls.length === 0)
  const nearLimit = content.length >= MAX_LENGTH - 50

  useEffect(() => {
    const el = inlineRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`
  }, [content])

  useEffect(() => {
    if (!expanded) return
    const el = dialogRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 460)}px`
  }, [content, expanded])

  function flashPosted() {
    setJustPosted(true)
    setTimeout(() => setJustPosted(false), 1800)
  }

  function notifyPosted() {
    toast({
      title: 'Đã đăng bài',
      description: 'Bài viết của bạn đã xuất hiện trên bảng tin.',
      variant: 'success',
    })
  }

  function removeImage(url: string) {
    setImageUrls(urls => urls.filter(item => item !== url))
  }

  function markTouched(e: React.FocusEvent<HTMLTextAreaElement>) {
    if (e.currentTarget === dialogRef.current) dialogTouched.current = true
    else inlineTouched.current = true
  }

  function insertEmoji(emoji: string) {
    const inDialog = expanded && Boolean(dialogRef.current)
    const el = inDialog ? dialogRef.current : inlineRef.current
    if (!el) return

    // Chỉ dùng caret thật khi người dùng đã từng đặt con trỏ vào ô viết.
    const touched = inDialog ? dialogTouched.current : inlineTouched.current
    const start = Math.min(touched ? el.selectionStart : content.length, content.length)
    const end = Math.min(
      touched ? Math.max(el.selectionEnd, start) : content.length,
      content.length
    )

    const next = (content.slice(0, start) + emoji + content.slice(end)).slice(0, MAX_LENGTH)
    setContent(next)

    const caret = Math.min(start + emoji.length, next.length)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(caret, caret)
    })
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

  async function submit() {
    if (posting || disabled) return
    setError(null)
    setPosting(true)

    if (demo) {
      await new Promise(resolve => setTimeout(resolve, 550))
      setPosting(false)
      setContent('')
      setImageUrls([])
      setExpanded(false)
      setEmojiOpen(false)
      flashPosted()
      notifyPosted()
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
    setExpanded(false)
    setEmojiOpen(false)
    flashPosted()
    notifyPosted()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      void submit()
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    void submit()
  }

  const uploadLabel = (
    <label
      className={cn(
        'inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-semibold transition-colors',
        imageUrls.length >= MAX_IMAGES
          ? 'cursor-not-allowed text-muted-foreground/50'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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
  )

  return (
    <>
      <Card
        className={cn(
          'relative isolate overflow-hidden border-primary/25 bg-secondary transition-[border-color,box-shadow] duration-300 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20',
          justPosted && 'ring-2 ring-primary/50'
        )}
      >
        <Guilloche className="text-primary" opacity={0.05} />
        <WatermarkCoin className="-bottom-12 -right-4" size={160} opacity={0.06} />
        <form onSubmit={handleSubmit} className="relative z-10">
          <div className="flex items-start justify-between gap-3 px-4 pt-4 sm:px-5">
            <div className="flex min-w-0 items-center gap-2.5">
              <Avatar src={avatarUrl} fallback={displayName} className="ring-2 ring-card" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{displayName}</p>
                <p className="text-[11px] text-secondary-foreground/60">
                  Chia sẻ với cộng đồng
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setEmojiOpen(false)
                setExpanded(true)
              }}
              aria-label="Mở rộng trình soạn thảo"
              className="shrink-0 gap-1.5 rounded-full px-2.5 text-[11px] font-semibold text-secondary-foreground/60 hover:bg-primary/10 hover:text-primary"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Mở rộng</span>
            </Button>
          </div>

          <div className="px-4 pt-2 sm:px-5">
            <Textarea
              ref={inlineRef}
              placeholder="Bạn đang nghĩ gì?"
              aria-label="Nội dung bài viết"
              maxLength={MAX_LENGTH}
              rows={3}
              value={content}
              onChange={e => setContent(e.target.value)}
              onFocus={markTouched}
              onKeyDown={handleKeyDown}
              className="min-h-[112px] resize-none border-0 bg-transparent p-0 text-body leading-relaxed shadow-none placeholder:text-secondary-foreground/65 focus-visible:outline-none focus-visible:ring-transparent focus-visible:ring-offset-0"
            />
          </div>

          <ImagePreviews
            urls={imageUrls}
            onRemove={removeImage}
            className="px-4 pt-3 sm:px-5"
          />

          {error && (
            <p
              role="alert"
              className="mx-4 mt-3 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive sm:mx-5"
            >
              {error}
            </p>
          )}

          {emojiOpen && !expanded && (
            <div className="px-4 pt-3 sm:px-5">
              <EmojiTray onPick={insertEmoji} onClose={() => setEmojiOpen(false)} />
            </div>
          )}

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-primary/15 px-4 py-2.5 sm:px-5">
            <div className="flex items-center gap-3">
              {uploadLabel}
              <EmojiTrigger
                active={emojiOpen}
                onClick={() => setEmojiOpen(value => !value)}
              />
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
              {justPosted ? (
                <span className="animate-rise inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-bold text-primary">
                  <Check className="h-3.5 w-3.5" /> Đã đăng
                </span>
              ) : (
                <span className="hidden text-[10px] font-semibold text-secondary-foreground/40 sm:block">
                  ⌘↵ để đăng
                </span>
              )}
              <Button type="submit" size="sm" loading={posting} disabled={disabled}>
                Đăng
              </Button>
            </div>
          </div>
        </form>
      </Card>

      <Dialog
        open={expanded}
        onOpenChange={open => {
          setExpanded(open)
          if (!open) setEmojiOpen(false)
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogTitle className="text-h2 font-extrabold tracking-tight">
            Tạo bài viết
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-foreground">
            Không gian rộng hơn cho bài viết dài. Nội dung và ảnh được giữ nguyên khi thu nhỏ.
          </DialogDescription>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div className="flex items-center gap-2.5">
              <Avatar src={avatarUrl} fallback={displayName} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{displayName}</p>
                <p className="text-[11px] text-muted-foreground">Đăng lên bảng tin</p>
              </div>
            </div>

            <Textarea
              ref={dialogRef}
              autoFocus
              placeholder="Bạn đang nghĩ gì?"
              aria-label="Nội dung bài viết"
              maxLength={MAX_LENGTH}
              rows={10}
              value={content}
              onChange={e => setContent(e.target.value)}
              onFocus={markTouched}
              onKeyDown={handleKeyDown}
              className="min-h-[38vh] resize-none border-border bg-muted/30 p-4 text-body leading-relaxed focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-offset-0"
            />

            <ImagePreviews urls={imageUrls} onRemove={removeImage} />

            {error && (
              <p
                role="alert"
                className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive"
              >
                {error}
              </p>
            )}

            {emojiOpen && expanded && (
              <EmojiTray onPick={insertEmoji} onClose={() => setEmojiOpen(false)} />
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
              <div className="flex items-center gap-3">
                {uploadLabel}
                <EmojiTrigger
                  active={emojiOpen}
                  onClick={() => setEmojiOpen(value => !value)}
                />
                <span
                  className={cn(
                    'text-[11px] font-semibold tabular',
                    nearLimit ? 'text-destructive' : 'text-muted-foreground'
                  )}
                >
                  {content.length}/{MAX_LENGTH}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden text-[10px] font-semibold text-muted-foreground sm:block">
                  ⌘↵ để đăng
                </span>
                <DialogClose asChild>
                  <Button type="button" variant="outline" size="sm">
                    Thu nhỏ
                  </Button>
                </DialogClose>
                <Button type="submit" size="sm" loading={posting} disabled={disabled}>
                  Đăng
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
