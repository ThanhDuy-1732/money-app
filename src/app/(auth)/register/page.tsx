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
