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
