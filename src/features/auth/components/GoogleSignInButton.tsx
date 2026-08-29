'use client'
import { Button } from '@/components/ui'
import { signInWithGoogle } from '../actions/auth.actions'

export function GoogleSignInButton() {
  return <Button variant="outline" onClick={() => signInWithGoogle()}>Đăng nhập bằng Google</Button>
}
