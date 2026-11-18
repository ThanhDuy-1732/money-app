'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { editProfileSchema, type EditProfileInput } from '@/lib/validators/profile'
import { updateProfile } from '../actions/profile.actions'
import { Button, Field, Input, Textarea } from '@/components/ui'

export function EditProfileForm({ defaultValues }: { defaultValues: EditProfileInput }) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditProfileInput>({
    resolver: zodResolver(editProfileSchema),
    defaultValues,
  })

  async function onSubmit(data: EditProfileInput) {
    setServerError(null)
    setSuccess(false)
    const result = await updateProfile(data)
    if (result.error) {
      setServerError(result.error)
      return
    }
    setSuccess(true)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field
        label="Tên hiển thị"
        htmlFor="display-name"
        error={errors.display_name?.message}
      >
        <Input
          id="display-name"
          placeholder="Tên hiển thị"
          invalid={!!errors.display_name}
          aria-describedby={errors.display_name ? 'display-name-error' : undefined}
          {...register('display_name')}
        />
      </Field>

      <Field label="Bio" htmlFor="bio" hint="Tối đa 160 ký tự" error={errors.bio?.message}>
        <Textarea
          id="bio"
          maxLength={160}
          placeholder="Giới thiệu ngắn về bạn"
          invalid={!!errors.bio}
          aria-describedby={errors.bio ? 'bio-error' : undefined}
          {...register('bio')}
        />
      </Field>

      {serverError && (
        <p
          role="alert"
          className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive"
        >
          {serverError}
        </p>
      )}
      {success && <p className="text-sm font-medium text-primary">Đã cập nhật hồ sơ.</p>}

      <Button type="submit" loading={isSubmitting}>
        Lưu thay đổi
      </Button>
    </form>
  )
}
