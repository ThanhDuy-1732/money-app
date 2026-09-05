# Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng toàn bộ frontend Next.js App Router cho money-app Phase 1 — 8 màn hình (F1–F8) theo 6 sprints.

**Architecture:** Feature-first structure: mỗi feature (`auth`, `feed`, `profile`, `wallet`, `referral`, `notifications`) tự chứa components + hooks + server actions. App Router pages chỉ là entry points, fetch data qua server client, pass props xuống feature components. Client Components chỉ khi cần event handlers hoặc Realtime.

**Tech Stack:** Next.js App Router + TypeScript + Tailwind CSS + Radix UI (headless) + class-variance-authority + react-hook-form + zod + @supabase/ssr + dayjs + Vitest

**Spec:** `docs/superpowers/specs/2026-08-28-frontend-design.md`

## Global Constraints

- Node.js 20 LTS+
- Routes tiếng Anh: `/register`, `/login`, `/feed`, `/profile`, `/wallet`, `/invite`, `/redeem`, `/explore`, `/notifications`, `/u/[username]`
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `NEXT_PUBLIC_SITE_URL` trong `.env.local`
- Server Components là default — `'use client'` chỉ khi cần interactivity hoặc Realtime
- Không gọi `add_points` hoặc `complete_referral` từ frontend
- `redeem_reward` là RPC duy nhất được phép gọi từ client
- Zod validators tái dùng cho cả form và test
- Vitest cho validators và business logic client-side

---

## File Structure

```
src/
  app/
    (auth)/
      register/page.tsx
      login/page.tsx
    feed/page.tsx
    profile/page.tsx
    u/[username]/page.tsx
    wallet/page.tsx
    invite/page.tsx
    redeem/page.tsx
    explore/page.tsx
    notifications/page.tsx
    layout.tsx
    error.tsx
    not-found.tsx
  middleware.ts
  features/
    auth/
      components/
        RegisterForm.tsx          # 'use client' — react-hook-form
        LoginForm.tsx             # 'use client' — react-hook-form + OTP step
        OtpInput.tsx              # 'use client'
        GoogleSignInButton.tsx    # 'use client'
      actions/
        auth.actions.ts           # Server Actions: signUp, signIn, signOut
      __tests__/
        auth.validators.test.ts
    feed/
      components/
        PostCard.tsx              # Server Component (hiển thị)
        PostComposer.tsx          # 'use client' — form + image upload
        LikeButton.tsx            # 'use client' — optimistic update
        CommentList.tsx           # Server Component
        CommentInput.tsx          # 'use client'
        FeedList.tsx              # Server Component
      actions/
        feed.actions.ts           # createPost, likePost, unlikePost, createComment
    profile/
      components/
        ProfileHeader.tsx         # Server Component
        EditProfileForm.tsx       # 'use client'
        AvatarUpload.tsx          # 'use client' — upload to Storage
        FollowButton.tsx          # 'use client'
      actions/
        profile.actions.ts        # updateProfile, followUser, unfollowUser
        streak.actions.ts         # recordLogin (update last_login_date)
    wallet/
      components/
        BalanceCard.tsx           # Server Component
        LedgerTable.tsx           # Server Component
        RedeemCard.tsx            # 'use client' — gọi redeem_reward RPC
      actions/
        wallet.actions.ts         # redeemReward
    referral/
      components/
        InviteLink.tsx            # 'use client' — copy to clipboard
        ReferralStatus.tsx        # Server Component
      actions/
        referral.actions.ts       # generateInviteLink
    notifications/
      components/
        NotificationList.tsx      # 'use client' — Realtime subscription
        NotificationBadge.tsx     # 'use client' — Realtime count
      actions/
        notifications.actions.ts  # markAsRead
  components/
    ui/
      button.tsx                  # Radix Slot + CVA variants
      input.tsx                   # Radix-styled input
      avatar.tsx                  # Radix Avatar
      badge.tsx                   # CVA badge
      dialog.tsx                  # Radix Dialog
      toast.tsx                   # Radix Toast
      index.ts                    # barrel export
  lib/
    supabase/
      client.ts
      server.ts
    types/
      database.ts                 # generated
    validators/
      auth.ts
      post.ts
      profile.ts
```

---

### Task 1: Project Setup & Dependencies (Sprint 0)

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/types/database.ts` (generated)
- Create: `.env.local`
- Create: `vitest.config.ts`

**Interfaces:**
- Produces: `createClient()` (browser), `createServerClient()` (server) — dùng bởi tất cả tasks sau

- [ ] **Step 1: Khởi tạo Next.js project**

```bash
cd /Users/thankz/Code/money-app
npx create-next-app@latest . \
  --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

- [ ] **Step 2: Cài dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install @radix-ui/react-avatar @radix-ui/react-dialog @radix-ui/react-slot @radix-ui/react-toast @radix-ui/react-label
npm install react-hook-form zod @hookform/resolvers
npm install class-variance-authority clsx tailwind-merge
npm install dayjs
npm install -D vitest @vitejs/plugin-react
```

- [ ] **Step 3: Vitest config**

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
  },
})
```

- [ ] **Step 4: Tạo .env.local**

```bash
# .env.local (local dev)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRFA0NiK7W9oaKFqYedj9TkX2Z4e7ePHOE_Y6jBg0lQ
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- [ ] **Step 5: Supabase browser client**

```ts
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 6: Supabase server client**

```ts
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/types/database'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 7: Generate types từ DB (sau khi Docker stack đã chạy)**

```bash
# Docker stack phải đang chạy (docker compose up -d)
npx supabase gen types typescript \
  --local \
  > src/lib/types/database.ts
```

- [ ] **Step 8: Middleware bảo vệ routes**

```ts
// src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/', '/register', '/login', '/explore']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  const isPublic = PUBLIC_ROUTES.some(r => request.nextUrl.pathname.startsWith(r))
    || request.nextUrl.pathname.startsWith('/u/')
  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

- [ ] **Step 9: Xác nhận dev server chạy được**

```bash
npm run dev
# Mở http://localhost:3000 — phải redirect về /login (middleware hoạt động)
```

- [ ] **Step 10: Commit**

```bash
git add .
git commit -m "feat(setup): init Next.js project, Supabase clients, middleware"
```

---

### Task 2: UI Primitives (Sprint 0)

**Files:**
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/avatar.tsx`
- Create: `src/components/ui/badge.tsx`
- Create: `src/components/ui/dialog.tsx`
- Create: `src/components/ui/toast.tsx`
- Create: `src/components/ui/index.ts`

**Interfaces:**
- Produces: `Button`, `Input`, `Avatar`, `Badge`, `Dialog`, `Toast` — dùng bởi tất cả feature components

- [ ] **Step 1: Helper cn() cho Tailwind class merging**

```ts
// src/lib/cn.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 2: Button component**

```tsx
// src/components/ui/button.tsx
'use client'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '@/lib/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-blue-600 text-white hover:bg-blue-700',
        outline: 'border border-gray-300 bg-transparent hover:bg-gray-50',
        ghost: 'hover:bg-gray-100',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  }
)
Button.displayName = 'Button'
```

- [ ] **Step 3: Input component**

```tsx
// src/components/ui/input.tsx
import * as React from 'react'
import { cn } from '@/lib/cn'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      className={cn(
        'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  )
)
Input.displayName = 'Input'
```

- [ ] **Step 4: Avatar component**

```tsx
// src/components/ui/avatar.tsx
'use client'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cn } from '@/lib/cn'

export function Avatar({ src, fallback, className }: { src?: string | null; fallback: string; className?: string }) {
  return (
    <AvatarPrimitive.Root className={cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full', className)}>
      {src && <AvatarPrimitive.Image src={src} alt={fallback} className="aspect-square h-full w-full object-cover" />}
      <AvatarPrimitive.Fallback className="flex h-full w-full items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600">
        {fallback.slice(0, 2).toUpperCase()}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  )
}
```

- [ ] **Step 5: Badge component**

```tsx
// src/components/ui/badge.tsx
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
  {
    variants: {
      variant: {
        default: 'bg-blue-100 text-blue-800',
        success: 'bg-green-100 text-green-800',
        warning: 'bg-yellow-100 text-yellow-800',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export function Badge({ className, variant, children }: VariantProps<typeof badgeVariants> & { className?: string; children: React.ReactNode }) {
  return <span className={cn(badgeVariants({ variant, className }))}>{children}</span>
}
```

- [ ] **Step 6: Dialog component**

```tsx
// src/components/ui/dialog.tsx
'use client'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/cn'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger

export function DialogContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg focus:outline-none',
          className
        )}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export const DialogTitle = DialogPrimitive.Title
export const DialogClose = DialogPrimitive.Close
```

- [ ] **Step 7: Toast (simple global toast via Radix)**

```tsx
// src/components/ui/toast.tsx
'use client'
import * as ToastPrimitive from '@radix-ui/react-toast'
import React from 'react'
import { cn } from '@/lib/cn'

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <ToastPrimitive.Provider swipeDirection="right">
      {children}
      <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80" />
    </ToastPrimitive.Provider>
  )
}

export function Toast({
  open, onOpenChange, title, description, variant = 'default',
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}) {
  return (
    <ToastPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      className={cn(
        'rounded-md p-4 shadow-lg border',
        variant === 'destructive' ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
      )}
    >
      <ToastPrimitive.Title className="text-sm font-semibold">{title}</ToastPrimitive.Title>
      {description && <ToastPrimitive.Description className="text-sm text-gray-500">{description}</ToastPrimitive.Description>}
    </ToastPrimitive.Root>
  )
}
```

- [ ] **Step 8: Barrel export**

```ts
// src/components/ui/index.ts
export { Button } from './button'
export { Input } from './input'
export { Avatar } from './avatar'
export { Badge } from './badge'
export { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogClose } from './dialog'
export { ToastProvider, Toast } from './toast'
```

- [ ] **Step 9: Commit**

```bash
git add src/components/ src/lib/cn.ts
git commit -m "feat(ui): add Radix-based primitive components (Button, Input, Avatar, Badge, Dialog, Toast)"
```

---

### Task 3: Zod Validators (Sprint 0)

**Files:**
- Create: `src/lib/validators/auth.ts`
- Create: `src/lib/validators/post.ts`
- Create: `src/lib/validators/profile.ts`
- Create: `src/features/auth/__tests__/auth.validators.test.ts`

**Interfaces:**
- Produces: `registerSchema`, `loginSchema`, `postSchema`, `editProfileSchema` — dùng bởi react-hook-form và tests

- [ ] **Step 1: Auth validators**

```ts
// src/lib/validators/auth.ts
import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  display_name: z.string().min(2, 'Tên tối thiểu 2 ký tự').max(30, 'Tên tối đa 30 ký tự'),
})

export const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
})

export const otpSchema = z.object({
  otp: z.string().length(6, 'Mã OTP gồm 6 số').regex(/^\d+$/, 'Chỉ nhập số'),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type OtpInput = z.infer<typeof otpSchema>
```

- [ ] **Step 2: Post validator**

```ts
// src/lib/validators/post.ts
import { z } from 'zod'

export const postSchema = z.object({
  content: z.string().max(500, 'Nội dung tối đa 500 ký tự').optional(),
  image_urls: z.array(z.string().url()).max(4, 'Tối đa 4 ảnh').default([]),
}).refine(
  data => (data.content && data.content.trim().length > 0) || data.image_urls.length > 0,
  { message: 'Bài đăng phải có nội dung hoặc ảnh' }
)

export type PostInput = z.infer<typeof postSchema>
```

- [ ] **Step 3: Profile validator**

```ts
// src/lib/validators/profile.ts
import { z } from 'zod'

export const editProfileSchema = z.object({
  display_name: z.string().min(2, 'Tên tối thiểu 2 ký tự').max(30, 'Tên tối đa 30 ký tự'),
  bio: z.string().max(160, 'Bio tối đa 160 ký tự').optional(),
})

export type EditProfileInput = z.infer<typeof editProfileSchema>
```

- [ ] **Step 4: Viết tests**

```ts
// src/features/auth/__tests__/auth.validators.test.ts
import { describe, it, expect } from 'vitest'
import { registerSchema, loginSchema, otpSchema } from '@/lib/validators/auth'

describe('registerSchema', () => {
  it('rejects invalid email', () => {
    const result = registerSchema.safeParse({ email: 'notanemail', display_name: 'Test' })
    expect(result.success).toBe(false)
  })
  it('rejects display_name shorter than 2 chars', () => {
    const result = registerSchema.safeParse({ email: 'a@b.com', display_name: 'A' })
    expect(result.success).toBe(false)
  })
  it('accepts valid input', () => {
    const result = registerSchema.safeParse({ email: 'a@b.com', display_name: 'Alice' })
    expect(result.success).toBe(true)
  })
})

describe('otpSchema', () => {
  it('rejects non-numeric OTP', () => {
    const result = otpSchema.safeParse({ otp: 'abc123' })
    expect(result.success).toBe(false)
  })
  it('rejects OTP not 6 digits', () => {
    const result = otpSchema.safeParse({ otp: '12345' })
    expect(result.success).toBe(false)
  })
  it('accepts valid 6-digit OTP', () => {
    const result = otpSchema.safeParse({ otp: '123456' })
    expect(result.success).toBe(true)
  })
})
```

- [ ] **Step 5: Chạy tests**

```bash
npx vitest run src/features/auth/__tests__/auth.validators.test.ts
# Expected: 5 tests PASS
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/validators/ src/features/auth/__tests__/
git commit -m "feat(validators): add zod schemas for auth, post, profile"
```

---

### Task 4: Auth — Register & Login (Sprint 1)

**Files:**
- Create: `src/features/auth/actions/auth.actions.ts`
- Create: `src/features/auth/components/RegisterForm.tsx`
- Create: `src/features/auth/components/LoginForm.tsx`
- Create: `src/features/auth/components/OtpInput.tsx`
- Create: `src/features/auth/components/GoogleSignInButton.tsx`
- Create: `src/app/(auth)/register/page.tsx`
- Create: `src/app/(auth)/login/page.tsx`

**Interfaces:**
- Consumes: `registerSchema`, `loginSchema`, `otpSchema` từ Task 3; `createClient()` server từ Task 1
- Produces: routes `/register`, `/login` hoạt động đầy đủ

- [ ] **Step 1: Server Actions**

```ts
// src/features/auth/actions/auth.actions.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signUpWithEmail(email: string, displayName: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/feed`,
    },
  })
  if (error) return { error: error.message }
  return { error: null }
}

export async function verifyOtp(email: string, token: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
  if (error) return { error: error.message }
  redirect('/feed')
}

export async function signInWithEmail(email: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/feed` },
  })
  if (error) return { error: error.message }
  return { error: null }
}

export async function signInWithGoogle() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/feed` },
  })
  if (error) return { error: error.message }
  if (data.url) redirect(data.url)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
```

- [ ] **Step 2: OTP Input component**

```tsx
// src/features/auth/components/OtpInput.tsx
'use client'
import { Input } from '@/components/ui'

export function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Input
      type="text"
      inputMode="numeric"
      maxLength={6}
      placeholder="000000"
      value={value}
      onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      className="text-center text-2xl tracking-widest"
    />
  )
}
```

- [ ] **Step 3: RegisterForm**

```tsx
// src/features/auth/components/RegisterForm.tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { registerSchema, otpSchema, type RegisterInput, type OtpInput } from '@/lib/validators/auth'
import { signUpWithEmail, verifyOtp } from '../actions/auth.actions'
import { Button, Input } from '@/components/ui'
import { OtpInput } from './OtpInput'

export function RegisterForm() {
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [serverError, setServerError] = useState<string | null>(null)

  const emailForm = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) })
  const otpForm = useForm<OtpInput>({ resolver: zodResolver(otpSchema) })

  async function onEmailSubmit(data: RegisterInput) {
    setServerError(null)
    const result = await signUpWithEmail(data.email, data.display_name)
    if (result.error) { setServerError(result.error); return }
    setEmail(data.email)
    setStep('otp')
  }

  async function onOtpSubmit(data: OtpInput) {
    setServerError(null)
    const result = await verifyOtp(email, data.otp)
    if (result?.error) setServerError(result.error)
  }

  if (step === 'otp') return (
    <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-4">
      <p className="text-sm text-gray-600">Nhập mã 6 số đã gửi đến <strong>{email}</strong></p>
      <OtpInput
        value={otpForm.watch('otp') ?? ''}
        onChange={v => otpForm.setValue('otp', v)}
      />
      {otpForm.formState.errors.otp && <p className="text-sm text-red-500">{otpForm.formState.errors.otp.message}</p>}
      {serverError && <p className="text-sm text-red-500">{serverError}</p>}
      <Button type="submit" className="w-full" disabled={otpForm.formState.isSubmitting}>
        {otpForm.formState.isSubmitting ? 'Đang xác nhận...' : 'Xác nhận'}
      </Button>
    </form>
  )

  return (
    <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
      <div>
        <Input placeholder="Tên hiển thị" {...emailForm.register('display_name')} />
        {emailForm.formState.errors.display_name && <p className="text-sm text-red-500">{emailForm.formState.errors.display_name.message}</p>}
      </div>
      <div>
        <Input type="email" placeholder="Email" {...emailForm.register('email')} />
        {emailForm.formState.errors.email && <p className="text-sm text-red-500">{emailForm.formState.errors.email.message}</p>}
      </div>
      {serverError && <p className="text-sm text-red-500">{serverError}</p>}
      <Button type="submit" className="w-full" disabled={emailForm.formState.isSubmitting}>
        {emailForm.formState.isSubmitting ? 'Đang gửi...' : 'Đăng ký'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 4: LoginForm**

```tsx
// src/features/auth/components/LoginForm.tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { loginSchema, otpSchema, type LoginInput, type OtpInput } from '@/lib/validators/auth'
import { signInWithEmail, verifyOtp } from '../actions/auth.actions'
import { Button, Input } from '@/components/ui'
import { OtpInput as OtpInputComp } from './OtpInput'

export function LoginForm() {
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [serverError, setServerError] = useState<string | null>(null)

  const emailForm = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })
  const otpForm = useForm<OtpInput>({ resolver: zodResolver(otpSchema) })

  async function onEmailSubmit(data: LoginInput) {
    setServerError(null)
    const result = await signInWithEmail(data.email)
    if (result.error) { setServerError(result.error); return }
    setEmail(data.email)
    setStep('otp')
  }

  async function onOtpSubmit(data: OtpInput) {
    setServerError(null)
    const result = await verifyOtp(email, data.otp)
    if (result?.error) setServerError(result.error)
  }

  if (step === 'otp') return (
    <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-4">
      <p className="text-sm text-gray-600">Mã OTP đã gửi đến <strong>{email}</strong></p>
      <OtpInputComp
        value={otpForm.watch('otp') ?? ''}
        onChange={v => otpForm.setValue('otp', v)}
      />
      {otpForm.formState.errors.otp && <p className="text-sm text-red-500">{otpForm.formState.errors.otp.message}</p>}
      {serverError && <p className="text-sm text-red-500">{serverError}</p>}
      <Button type="submit" className="w-full" disabled={otpForm.formState.isSubmitting}>
        {otpForm.formState.isSubmitting ? 'Đang xác nhận...' : 'Đăng nhập'}
      </Button>
    </form>
  )

  return (
    <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
      <Input type="email" placeholder="Email" {...emailForm.register('email')} />
      {emailForm.formState.errors.email && <p className="text-sm text-red-500">{emailForm.formState.errors.email.message}</p>}
      {serverError && <p className="text-sm text-red-500">{serverError}</p>}
      <Button type="submit" className="w-full" disabled={emailForm.formState.isSubmitting}>
        {emailForm.formState.isSubmitting ? 'Đang gửi...' : 'Tiếp tục'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 5: Pages**

```tsx
// src/app/(auth)/register/page.tsx
import { RegisterForm } from '@/features/auth/components/RegisterForm'
import Link from 'next/link'

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-bold text-center">Đăng ký</h1>
        <RegisterForm />
        <p className="text-center text-sm text-gray-600">
          Đã có tài khoản?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">Đăng nhập</Link>
        </p>
      </div>
    </div>
  )
}
```

```tsx
// src/app/(auth)/login/page.tsx
import { LoginForm } from '@/features/auth/components/LoginForm'
import Link from 'next/link'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-bold text-center">Đăng nhập</h1>
        <LoginForm />
        <p className="text-center text-sm text-gray-600">
          Chưa có tài khoản?{' '}
          <Link href="/register" className="text-blue-600 hover:underline">Đăng ký</Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Test thủ công**

```bash
npm run dev
# 1. Mở http://localhost:3000/register
# 2. Điền email + tên → Submit
# 3. Mở http://localhost:9000 (Inbucket) → xem mã OTP
# 4. Nhập mã OTP → phải redirect về /feed
```

- [ ] **Step 7: Commit**

```bash
git add src/features/auth/ src/app/\(auth\)/
git commit -m "feat(auth): add register + login with email OTP flow"
```

---

### Task 5: Profile — View & Edit (Sprint 1)

**Files:**
- Create: `src/features/profile/components/ProfileHeader.tsx`
- Create: `src/features/profile/components/EditProfileForm.tsx`
- Create: `src/features/profile/components/AvatarUpload.tsx`
- Create: `src/features/profile/actions/profile.actions.ts`
- Create: `src/features/profile/actions/streak.actions.ts`
- Create: `src/app/profile/page.tsx`

**Interfaces:**
- Consumes: `editProfileSchema` từ Task 3; Storage bucket `avatars`
- Produces: route `/profile` với xem/edit profile; `recordLogin()` action cho streak

- [ ] **Step 1: Profile Server Actions**

```ts
// src/features/profile/actions/profile.actions.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { editProfileSchema } from '@/lib/validators/profile'

export async function updateProfile(formData: { display_name: string; bio?: string }) {
  const parsed = editProfileSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { error } = await supabase
    .from('profiles')
    .update({ display_name: parsed.data.display_name, bio: parsed.data.bio ?? null })
    .eq('id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/profile')
  return { error: null }
}
```

- [ ] **Step 2: Streak Server Action**

```ts
// src/features/profile/actions/streak.actions.ts
'use server'
import { createClient } from '@/lib/supabase/server'

export async function recordLogin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const today = new Date().toISOString().split('T')[0]
  await supabase
    .from('profiles')
    .update({ last_login_date: today })
    .eq('id', user.id)
  // DB trigger trg_login_streak tự xử lý streak_count và cộng điểm
}
```

- [ ] **Step 3: AvatarUpload component**

```tsx
// src/features/profile/components/AvatarUpload.tsx
'use client'
import { createClient } from '@/lib/supabase/client'
import { useState, useRef } from 'react'
import { Avatar } from '@/components/ui'
import { revalidatePath } from 'next/cache' // dùng router.refresh() thay

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
```

- [ ] **Step 4: EditProfileForm**

```tsx
// src/features/profile/components/EditProfileForm.tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { editProfileSchema, type EditProfileInput } from '@/lib/validators/profile'
import { updateProfile } from '../actions/profile.actions'
import { Button, Input } from '@/components/ui'
import { useState } from 'react'

export function EditProfileForm({ defaultValues }: { defaultValues: EditProfileInput }) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<EditProfileInput>({
    resolver: zodResolver(editProfileSchema),
    defaultValues,
  })

  async function onSubmit(data: EditProfileInput) {
    setServerError(null)
    setSuccess(false)
    const result = await updateProfile(data)
    if (result.error) { setServerError(result.error); return }
    setSuccess(true)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Input placeholder="Tên hiển thị" {...register('display_name')} />
        {errors.display_name && <p className="text-sm text-red-500">{errors.display_name.message}</p>}
      </div>
      <div>
        <textarea
          placeholder="Bio (tối đa 160 ký tự)"
          maxLength={160}
          className="flex min-h-[80px] w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          {...register('bio')}
        />
        {errors.bio && <p className="text-sm text-red-500">{errors.bio.message}</p>}
      </div>
      {serverError && <p className="text-sm text-red-500">{serverError}</p>}
      {success && <p className="text-sm text-green-600">Đã cập nhật!</p>}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Đang lưu...' : 'Lưu'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 5: ProfileHeader**

```tsx
// src/features/profile/components/ProfileHeader.tsx
import { Avatar, Badge } from '@/components/ui'
import type { Database } from '@/lib/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

export function ProfileHeader({ profile }: { profile: Profile }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <Avatar src={profile.avatar_url} fallback={profile.display_name} className="h-20 w-20" />
      <h1 className="text-xl font-bold">{profile.display_name}</h1>
      {profile.bio && <p className="text-sm text-gray-600 text-center max-w-sm">{profile.bio}</p>}
      <div className="flex gap-4 text-sm text-gray-500">
        <Badge variant="default">{profile.points_balance} điểm</Badge>
        <span>Streak: {profile.streak_count} ngày 🔥</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Profile page**

```tsx
// src/app/profile/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileHeader } from '@/features/profile/components/ProfileHeader'
import { EditProfileForm } from '@/features/profile/components/EditProfileForm'
import { AvatarUpload } from '@/features/profile/components/AvatarUpload'
import { recordLogin } from '@/features/profile/actions/streak.actions'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Cập nhật streak khi user vào app
  await recordLogin()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return (
    <main className="max-w-lg mx-auto px-4">
      <AvatarUpload userId={user.id} currentUrl={profile.avatar_url} />
      <ProfileHeader profile={profile} />
      <section className="mt-6">
        <h2 className="text-lg font-semibold mb-4">Chỉnh sửa hồ sơ</h2>
        <EditProfileForm defaultValues={{ display_name: profile.display_name, bio: profile.bio ?? undefined }} />
      </section>
    </main>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add src/features/profile/ src/app/profile/
git commit -m "feat(profile): add profile view, edit form, avatar upload, streak action"
```

---

### Task 6: Feed — PostComposer & PostCard (Sprint 2)

**Files:**
- Create: `src/features/feed/actions/feed.actions.ts`
- Create: `src/features/feed/components/PostComposer.tsx`
- Create: `src/features/feed/components/PostCard.tsx`
- Create: `src/features/feed/components/LikeButton.tsx`
- Create: `src/features/feed/components/CommentList.tsx`
- Create: `src/features/feed/components/CommentInput.tsx`
- Create: `src/features/feed/components/FeedList.tsx`
- Create: `src/app/feed/page.tsx`
- Create: `src/app/explore/page.tsx`

**Interfaces:**
- Consumes: `postSchema` từ Task 3; Storage bucket `post-images`; `Avatar` từ Task 2
- Produces: routes `/feed`, `/explore`

- [ ] **Step 1: Feed Server Actions**

```ts
// src/features/feed/actions/feed.actions.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { postSchema } from '@/lib/validators/post'

export async function createPost(data: { content?: string; image_urls?: string[] }) {
  const parsed = postSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { error } = await supabase.from('posts').insert({
    user_id: user.id,
    content: parsed.data.content,
    image_urls: parsed.data.image_urls,
  })
  if (error) return { error: error.message }
  revalidatePath('/feed')
  return { error: null }
}

export async function likePost(postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }
  await supabase.from('likes').insert({ post_id: postId, user_id: user.id })
  return { error: null }
}

export async function unlikePost(postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }
  await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user.id)
  return { error: null }
}

export async function createComment(postId: string, content: string) {
  if (content.trim().length === 0 || content.length > 300) return { error: 'Nội dung không hợp lệ' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }
  const { error } = await supabase.from('comments').insert({ post_id: postId, user_id: user.id, content })
  if (error) return { error: error.message }
  revalidatePath('/feed')
  return { error: null }
}
```

- [ ] **Step 2: PostComposer**

```tsx
// src/features/feed/components/PostComposer.tsx
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
      const path = `${userId}/${Date.now()}-${file.name}`
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
```

- [ ] **Step 3: LikeButton (optimistic update)**

```tsx
// src/features/feed/components/LikeButton.tsx
'use client'
import { useState } from 'react'
import { likePost, unlikePost } from '../actions/feed.actions'
import { Button } from '@/components/ui'

export function LikeButton({
  postId, initialCount, initialLiked,
}: { postId: string; initialCount: number; initialLiked: boolean }) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)

  async function toggle() {
    // Optimistic update
    const next = !liked
    setLiked(next)
    setCount(c => c + (next ? 1 : -1))
    if (next) await likePost(postId)
    else await unlikePost(postId)
  }

  return (
    <Button variant="ghost" size="sm" onClick={toggle} className="gap-1 text-gray-500">
      {liked ? '❤️' : '🤍'} {count}
    </Button>
  )
}
```

- [ ] **Step 4: CommentInput**

```tsx
// src/features/feed/components/CommentInput.tsx
'use client'
import { useState } from 'react'
import { createComment } from '../actions/feed.actions'
import { Input, Button } from '@/components/ui'

export function CommentInput({ postId }: { postId: string }) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setLoading(true)
    await createComment(postId, content)
    setContent('')
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-2">
      <Input
        placeholder="Bình luận..."
        value={content}
        onChange={e => setContent(e.target.value)}
        maxLength={300}
        className="flex-1 h-8 text-sm"
      />
      <Button type="submit" size="sm" disabled={loading || !content.trim()}>Gửi</Button>
    </form>
  )
}
```

- [ ] **Step 5: PostCard + CommentList**

```tsx
// src/features/feed/components/CommentList.tsx
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/vi'
import type { Database } from '@/lib/types/database'
dayjs.extend(relativeTime)
dayjs.locale('vi')

type Comment = Database['public']['Tables']['comments']['Row'] & {
  profiles: { display_name: string; avatar_url: string | null }
}

export function CommentList({ comments }: { comments: Comment[] }) {
  if (comments.length === 0) return null
  return (
    <div className="space-y-2 mt-2">
      {comments.map(c => (
        <div key={c.id} className="flex gap-2 text-sm">
          <span className="font-medium">{c.profiles.display_name}</span>
          <span className="text-gray-700 flex-1">{c.content}</span>
          <span className="text-gray-400 text-xs">{dayjs(c.created_at).fromNow()}</span>
        </div>
      ))}
    </div>
  )
}
```

```tsx
// src/features/feed/components/PostCard.tsx
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/vi'
import { Avatar } from '@/components/ui'
import { LikeButton } from './LikeButton'
import { CommentList } from './CommentList'
import { CommentInput } from './CommentInput'
import type { Database } from '@/lib/types/database'
dayjs.extend(relativeTime)
dayjs.locale('vi')

type Post = Database['public']['Tables']['posts']['Row'] & {
  profiles: { display_name: string; avatar_url: string | null }
  comments: Array<Database['public']['Tables']['comments']['Row'] & {
    profiles: { display_name: string; avatar_url: string | null }
  }>
  user_liked?: boolean
}

export function PostCard({ post, currentUserId }: { post: Post; currentUserId?: string }) {
  const images = (post.image_urls as string[]) ?? []
  return (
    <article className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Avatar src={post.profiles.avatar_url} fallback={post.profiles.display_name} />
        <div>
          <p className="font-medium text-sm">{post.profiles.display_name}</p>
          <p className="text-xs text-gray-400">{dayjs(post.created_at).fromNow()}</p>
        </div>
      </div>
      {post.content && <p className="text-sm text-gray-800">{post.content}</p>}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-1">
          {images.map(url => <img key={url} src={url} alt="" className="rounded object-cover w-full aspect-square" />)}
        </div>
      )}
      <div className="flex gap-2">
        <LikeButton postId={post.id} initialCount={post.like_count} initialLiked={post.user_liked ?? false} />
        <span className="text-sm text-gray-500 self-center">💬 {post.comment_count}</span>
      </div>
      <CommentList comments={post.comments} />
      {currentUserId && <CommentInput postId={post.id} />}
    </article>
  )
}
```

- [ ] **Step 6: FeedList + Pages**

```tsx
// src/features/feed/components/FeedList.tsx
import { createClient } from '@/lib/supabase/server'
import { PostCard } from './PostCard'

export async function FeedList({ userId, followingOnly = false }: { userId?: string; followingOnly?: boolean }) {
  const supabase = await createClient()

  let query = supabase
    .from('posts')
    .select(`
      *,
      profiles(display_name, avatar_url),
      comments(*, profiles(display_name, avatar_url))
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(20)

  if (followingOnly && userId) {
    const { data: following } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)
    const ids = [userId, ...(following?.map(f => f.following_id) ?? [])]
    query = query.in('user_id', ids)
  }

  const { data: posts } = await query
  if (!posts?.length) return <p className="text-center text-gray-400 py-8">Chưa có bài đăng nào.</p>

  return (
    <div className="space-y-4">
      {posts.map(post => <PostCard key={post.id} post={post as any} currentUserId={userId} />)}
    </div>
  )
}
```

```tsx
// src/app/feed/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PostComposer } from '@/features/feed/components/PostComposer'
import { FeedList } from '@/features/feed/components/FeedList'

export default async function FeedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <PostComposer userId={user.id} />
      <FeedList userId={user.id} followingOnly />
    </main>
  )
}
```

```tsx
// src/app/explore/page.tsx
import { FeedList } from '@/features/feed/components/FeedList'
import { createClient } from '@/lib/supabase/server'

export default async function ExplorePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return (
    <main className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-6">Khám phá</h1>
      <FeedList userId={user?.id} />
    </main>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add src/features/feed/ src/app/feed/ src/app/explore/
git commit -m "feat(feed): add PostComposer, PostCard, LikeButton, CommentList, feed + explore pages"
```

---

### Task 7: Follow & Public Profile (Sprint 3)

**Files:**
- Create: `src/features/profile/components/FollowButton.tsx`
- Create: `src/features/profile/actions/profile.actions.ts` (thêm follow actions)
- Create: `src/app/u/[username]/page.tsx`

**Interfaces:**
- Consumes: `ProfileHeader` từ Task 5; `FeedList` từ Task 6
- Produces: route `/u/[username]`, follow/unfollow

- [ ] **Step 1: Thêm follow actions vào profile.actions.ts**

```ts
// Thêm vào cuối src/features/profile/actions/profile.actions.ts

export async function followUser(targetUserId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }
  const { error } = await supabase.from('follows').insert({ follower_id: user.id, following_id: targetUserId })
  if (error) return { error: error.message }
  revalidatePath(`/u/${targetUserId}`)
  return { error: null }
}

export async function unfollowUser(targetUserId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }
  await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetUserId)
  revalidatePath(`/u/${targetUserId}`)
  return { error: null }
}
```

- [ ] **Step 2: FollowButton**

```tsx
// src/features/profile/components/FollowButton.tsx
'use client'
import { useState } from 'react'
import { followUser, unfollowUser } from '../actions/profile.actions'
import { Button } from '@/components/ui'

export function FollowButton({ targetUserId, initialFollowing }: { targetUserId: string; initialFollowing: boolean }) {
  const [following, setFollowing] = useState(initialFollowing)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    if (following) await unfollowUser(targetUserId)
    else await followUser(targetUserId)
    setFollowing(f => !f)
    setLoading(false)
  }

  return (
    <Button variant={following ? 'outline' : 'default'} size="sm" onClick={toggle} disabled={loading}>
      {following ? 'Đang theo dõi' : 'Theo dõi'}
    </Button>
  )
}
```

- [ ] **Step 3: Public profile page**

```tsx
// src/app/u/[username]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ProfileHeader } from '@/features/profile/components/ProfileHeader'
import { FollowButton } from '@/features/profile/components/FollowButton'
import { FeedList } from '@/features/feed/components/FeedList'

export default async function PublicProfilePage({ params }: { params: { username: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('display_name', params.username)
    .single()

  if (!profile) notFound()

  let isFollowing = false
  if (user && user.id !== profile.id) {
    const { data } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('following_id', profile.id)
      .maybeSingle()
    isFollowing = !!data
  }

  return (
    <main className="max-w-lg mx-auto px-4">
      <ProfileHeader profile={profile} />
      {user && user.id !== profile.id && (
        <div className="flex justify-center mb-6">
          <FollowButton targetUserId={profile.id} initialFollowing={isFollowing} />
        </div>
      )}
      <FeedList userId={profile.id} />
    </main>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/features/profile/components/FollowButton.tsx src/app/u/
git commit -m "feat(social): add follow/unfollow, public profile page /u/[username]"
```

---

### Task 8: Referral — Invite Page (Sprint 3)

**Files:**
- Create: `src/features/referral/components/InviteLink.tsx`
- Create: `src/features/referral/components/ReferralStatus.tsx`
- Create: `src/features/referral/actions/referral.actions.ts`
- Create: `src/app/invite/page.tsx`

**Interfaces:**
- Produces: route `/invite` với invite link generation và copy-to-clipboard

- [ ] **Step 1: Referral actions**

```ts
// src/features/referral/actions/referral.actions.ts
'use server'
import { createClient } from '@/lib/supabase/server'

export async function getOrCreateReferralCode(): Promise<{ code: string | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { code: null, error: 'Chưa đăng nhập' }

  // Lấy referral code hiện có (referrer = user này, tìm code từ row đã tạo)
  // Dùng user_id hash đơn giản làm referral code
  const code = user.id.slice(0, 8)
  return { code, error: null }
}

export async function getReferralStats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { total: 0, rewarded: 0 }

  const { data } = await supabase
    .from('referrals')
    .select('status')
    .eq('referrer_id', user.id)

  return {
    total: data?.length ?? 0,
    rewarded: data?.filter(r => r.status === 'rewarded').length ?? 0,
  }
}
```

- [ ] **Step 2: InviteLink component**

```tsx
// src/features/referral/components/InviteLink.tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui'

export function InviteLink({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const link = `${process.env.NEXT_PUBLIC_SITE_URL}/register?ref=${code}`

  async function copy() {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Link mời của bạn:</p>
      <div className="flex gap-2">
        <code className="flex-1 text-xs bg-gray-100 rounded px-3 py-2 break-all">{link}</code>
        <Button size="sm" variant="outline" onClick={copy}>
          {copied ? '✓ Đã copy' : 'Copy'}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: ReferralStatus**

```tsx
// src/features/referral/components/ReferralStatus.tsx
export function ReferralStatus({ total, rewarded }: { total: number; rewarded: number }) {
  return (
    <div className="rounded-lg border p-4 space-y-1">
      <p className="text-sm text-gray-600">Đã mời: <strong>{total} người</strong></p>
      <p className="text-sm text-gray-600">Đã nhận thưởng: <strong>{rewarded} người</strong></p>
      <p className="text-xs text-gray-400">Bạn nhận 100đ khi người được mời đăng bài đầu tiên.</p>
    </div>
  )
}
```

- [ ] **Step 4: Invite page**

```tsx
// src/app/invite/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getOrCreateReferralCode, getReferralStats } from '@/features/referral/actions/referral.actions'
import { InviteLink } from '@/features/referral/components/InviteLink'
import { ReferralStatus } from '@/features/referral/components/ReferralStatus'

export default async function InvitePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ code }, stats] = await Promise.all([getOrCreateReferralCode(), getReferralStats()])

  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold">Mời bạn bè</h1>
      <p className="text-sm text-gray-600">Mời bạn tham gia — bạn nhận 100đ, người được mời nhận 50đ khi đăng bài đầu tiên.</p>
      {code && <InviteLink code={code} />}
      <ReferralStatus total={stats.total} rewarded={stats.rewarded} />
    </main>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/features/referral/ src/app/invite/
git commit -m "feat(referral): add invite page with copy link and referral stats"
```

---

### Task 9: Wallet — Balance & Ledger (Sprint 4)

**Files:**
- Create: `src/features/wallet/components/BalanceCard.tsx`
- Create: `src/features/wallet/components/LedgerTable.tsx`
- Create: `src/app/wallet/page.tsx`

**Interfaces:**
- Consumes: `points_ledger`, `profiles.points_balance` từ DB
- Produces: route `/wallet`

- [ ] **Step 1: BalanceCard**

```tsx
// src/features/wallet/components/BalanceCard.tsx
export function BalanceCard({ balance, streak }: { balance: number; streak: number }) {
  return (
    <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white p-6 space-y-1">
      <p className="text-sm opacity-80">Số dư điểm</p>
      <p className="text-4xl font-bold">{balance.toLocaleString('vi-VN')} đ</p>
      <p className="text-sm opacity-70">🔥 Streak {streak} ngày</p>
    </div>
  )
}
```

- [ ] **Step 2: LedgerTable**

```tsx
// src/features/wallet/components/LedgerTable.tsx
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/vi'
import type { Database } from '@/lib/types/database'
dayjs.extend(relativeTime)
dayjs.locale('vi')

type LedgerRow = Database['public']['Tables']['points_ledger']['Row']

const REASON_LABELS: Record<string, string> = {
  signup: 'Đăng ký',
  profile_complete: 'Hoàn thiện hồ sơ',
  streak: 'Đăng nhập hàng ngày',
  post: 'Đăng bài',
  referral_in: 'Được mời',
  referral_out: 'Mời bạn thành công',
  redeem: 'Đổi điểm',
  adjustment: 'Nạp tiền',
}

export function LedgerTable({ rows }: { rows: LedgerRow[] }) {
  if (rows.length === 0) return <p className="text-center text-gray-400 py-4">Chưa có giao dịch nào.</p>
  return (
    <div className="divide-y">
      {rows.map(row => (
        <div key={row.id} className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium">{REASON_LABELS[row.reason_code] ?? row.reason_code}</p>
            <p className="text-xs text-gray-400">{dayjs(row.created_at).fromNow()}</p>
          </div>
          <span className={`font-semibold ${row.delta > 0 ? 'text-green-600' : 'text-red-500'}`}>
            {row.delta > 0 ? '+' : ''}{row.delta}đ
          </span>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Wallet page**

```tsx
// src/app/wallet/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BalanceCard } from '@/features/wallet/components/BalanceCard'
import { LedgerTable } from '@/features/wallet/components/LedgerTable'
import Link from 'next/link'
import { Button } from '@/components/ui'

export default async function WalletPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: ledger }] = await Promise.all([
    supabase.from('profiles').select('points_balance, streak_count').eq('id', user.id).single(),
    supabase.from('points_ledger').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
  ])

  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <BalanceCard balance={profile?.points_balance ?? 0} streak={profile?.streak_count ?? 0} />
      <div className="flex justify-end">
        <Button asChild size="sm">
          <Link href="/redeem">Đổi điểm</Link>
        </Button>
      </div>
      <section>
        <h2 className="text-lg font-semibold mb-2">Lịch sử</h2>
        <LedgerTable rows={ledger ?? []} />
      </section>
    </main>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/features/wallet/components/BalanceCard.tsx src/features/wallet/components/LedgerTable.tsx src/app/wallet/
git commit -m "feat(wallet): add balance card, ledger history, wallet page"
```

---

### Task 10: Redeem Rewards (Sprint 5)

**Files:**
- Create: `src/features/wallet/components/RedeemCard.tsx`
- Create: `src/features/wallet/actions/wallet.actions.ts`
- Create: `src/app/redeem/page.tsx`

**Interfaces:**
- Consumes: `supabase.rpc('redeem_reward')`, `rewards` table
- Produces: route `/redeem`

- [ ] **Step 1: Wallet action — redeemReward**

```ts
// src/features/wallet/actions/wallet.actions.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function redeemReward(rewardId: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('redeem_reward', { p_reward_id: rewardId })
  if (error) return { error: error.message }
  revalidatePath('/wallet')
  revalidatePath('/redeem')
  return { error: null }
}
```

- [ ] **Step 2: RedeemCard**

```tsx
// src/features/wallet/components/RedeemCard.tsx
'use client'
import { useState } from 'react'
import { redeemReward } from '../actions/wallet.actions'
import { Button, Badge } from '@/components/ui'
import type { Database } from '@/lib/types/database'

type Reward = Database['public']['Tables']['rewards']['Row']

export function RedeemCard({ reward, userBalance }: { reward: Reward; userBalance: number }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const canAfford = userBalance >= reward.points_cost

  async function handleRedeem() {
    setLoading(true)
    setError(null)
    const result = await redeemReward(reward.id)
    setLoading(false)
    if (result.error) { setError(result.error); return }
    setSuccess(true)
  }

  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div className="flex items-start justify-between">
        <h3 className="font-medium text-sm">{reward.name}</h3>
        <Badge variant={canAfford ? 'success' : 'warning'}>{reward.points_cost}đ</Badge>
      </div>
      {reward.description && <p className="text-xs text-gray-500">{reward.description}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
      {success
        ? <p className="text-xs text-green-600">✓ Đã đổi thành công!</p>
        : (
          <Button
            size="sm"
            variant={canAfford ? 'default' : 'outline'}
            disabled={!canAfford || loading}
            onClick={handleRedeem}
            className="w-full"
          >
            {loading ? 'Đang xử lý...' : canAfford ? 'Đổi ngay' : 'Không đủ điểm'}
          </Button>
        )
      }
    </div>
  )
}
```

- [ ] **Step 3: Redeem page**

```tsx
// src/app/redeem/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RedeemCard } from '@/features/wallet/components/RedeemCard'

export default async function RedeemPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: rewards }] = await Promise.all([
    supabase.from('profiles').select('points_balance').eq('id', user.id).single(),
    supabase.from('rewards').select('*').eq('active', true).order('points_cost'),
  ])

  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Đổi điểm</h1>
        <span className="text-sm text-gray-600">Số dư: <strong>{profile?.points_balance ?? 0}đ</strong></span>
      </div>
      {rewards?.map(reward => (
        <RedeemCard key={reward.id} reward={reward} userBalance={profile?.points_balance ?? 0} />
      ))}
    </main>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/features/wallet/ src/app/redeem/
git commit -m "feat(redeem): add rewards catalog and redeem_reward RPC integration"
```

---

### Task 11: Notifications (Sprint 6)

**Files:**
- Create: `src/features/notifications/components/NotificationList.tsx`
- Create: `src/features/notifications/components/NotificationBadge.tsx`
- Create: `src/features/notifications/actions/notifications.actions.ts`
- Create: `src/app/notifications/page.tsx`

**Interfaces:**
- Consumes: `notifications` table, Supabase Realtime
- Produces: route `/notifications`, realtime badge count

- [ ] **Step 1: Notifications action**

```ts
// src/features/notifications/actions/notifications.actions.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function markAllAsRead() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null)
  revalidatePath('/notifications')
}
```

- [ ] **Step 2: NotificationList với Realtime**

```tsx
// src/features/notifications/components/NotificationList.tsx
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/vi'
import { markAllAsRead } from '../actions/notifications.actions'
import { Button } from '@/components/ui'
import type { Database } from '@/lib/types/database'
dayjs.extend(relativeTime)
dayjs.locale('vi')

type Notification = Database['public']['Tables']['notifications']['Row']

const TYPE_LABELS: Record<string, string> = {
  follow: 'đã theo dõi bạn',
  like: 'đã thích bài viết của bạn',
  comment: 'đã bình luận bài viết của bạn',
  points: 'bạn vừa nhận điểm thưởng',
  referral: 'bạn bè đã tham gia qua lời mời của bạn',
}

export function NotificationList({ initialItems, userId }: { initialItems: Notification[]; userId: string }) {
  const [items, setItems] = useState(initialItems)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        payload => setItems(prev => [payload.new as Notification, ...prev])
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  if (items.length === 0) return <p className="text-center text-gray-400 py-8">Chưa có thông báo.</p>

  return (
    <div className="space-y-1">
      <div className="flex justify-end mb-2">
        <Button variant="ghost" size="sm" onClick={() => markAllAsRead()}>Đánh dấu đã đọc</Button>
      </div>
      {items.map(n => (
        <div key={n.id} className={`flex items-start gap-3 p-3 rounded-lg ${n.read_at ? '' : 'bg-blue-50'}`}>
          <div className="flex-1">
            <p className="text-sm">{TYPE_LABELS[n.type] ?? n.type}</p>
            <p className="text-xs text-gray-400">{dayjs(n.created_at).fromNow()}</p>
          </div>
          {!n.read_at && <span className="h-2 w-2 rounded-full bg-blue-500 mt-1 shrink-0" />}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: NotificationBadge (realtime unread count)**

```tsx
// src/features/notifications/components/NotificationBadge.tsx
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export function NotificationBadge({ userId, initialCount }: { userId: string; initialCount: number }) {
  const [count, setCount] = useState(initialCount)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('notif-badge')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => setCount(c => c + 1)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => setCount(0) // đơn giản hóa: reset khi có update (mark as read)
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  return (
    <Link href="/notifications" className="relative">
      🔔
      {count > 0 && (
        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  )
}
```

- [ ] **Step 4: Notifications page**

```tsx
// src/app/notifications/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NotificationList } from '@/features/notifications/components/NotificationList'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <main className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-4">Thông báo</h1>
      <NotificationList initialItems={notifications ?? []} userId={user.id} />
    </main>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/features/notifications/ src/app/notifications/
git commit -m "feat(notifications): add notification list with realtime updates and badge"
```

---

### Task 12: Root Layout & App Shell (Sprint 0/1)

**Files:**
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `ToastProvider` từ Task 2; `NotificationBadge` từ Task 11; `recordLogin` từ Task 5
- Produces: nav bar, toast context, streak trigger

- [ ] **Step 1: Root layout với nav**

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/ui'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { signOut } from '@/features/auth/actions/auth.actions'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Money App',
  description: 'Social + điểm thưởng',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="vi">
      <body className={inter.className}>
        <ToastProvider>
          {user && (
            <nav className="sticky top-0 z-40 border-b bg-white px-4 py-3 flex items-center justify-between">
              <Link href="/feed" className="font-bold text-blue-600">MoneyApp</Link>
              <div className="flex items-center gap-4 text-sm">
                <Link href="/feed">Feed</Link>
                <Link href="/explore">Khám phá</Link>
                <Link href="/wallet">Ví</Link>
                <Link href="/invite">Mời bạn</Link>
                <Link href="/notifications">🔔</Link>
                <Link href="/profile">Hồ sơ</Link>
                <form action={signOut}><button type="submit" className="text-gray-400 hover:text-gray-600">Đăng xuất</button></form>
              </div>
            </nav>
          )}
          <div className="min-h-screen">{children}</div>
        </ToastProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Error boundary**

```tsx
// src/app/error.tsx
'use client'
import { Button } from '@/components/ui'

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-xl font-semibold">Đã có lỗi xảy ra</h2>
        <Button onClick={reset}>Thử lại</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Not found page**

```tsx
// src/app/not-found.tsx
import Link from 'next/link'
import { Button } from '@/components/ui'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-xl font-semibold">Không tìm thấy trang</h2>
        <Button asChild><Link href="/feed">Về trang chủ</Link></Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/error.tsx src/app/not-found.tsx
git commit -m "feat(shell): add root layout with nav, error boundary, not-found page"
```
