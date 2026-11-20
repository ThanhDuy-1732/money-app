import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/features/auth/actions/auth.actions', () => ({
  signUpWithEmail: vi.fn(),
  signInWithEmail: vi.fn(),
  verifyOtp: vi.fn(),
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
}))

import { LoginForm } from '@/features/auth/components/LoginForm'
import { RegisterForm } from '@/features/auth/components/RegisterForm'

describe('auth forms', () => {
  it('shows the app validation message instead of the browser one on register', () => {
    const html = renderToStaticMarkup(<RegisterForm />)
    expect(html.toLowerCase()).toContain('novalidate')
  })

  it('shows the app validation message instead of the browser one on login', () => {
    const html = renderToStaticMarkup(<LoginForm />)
    expect(html.toLowerCase()).toContain('novalidate')
  })
})
