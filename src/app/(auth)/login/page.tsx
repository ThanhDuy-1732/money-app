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
