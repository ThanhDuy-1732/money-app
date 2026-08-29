import { z } from 'zod'

export const editProfileSchema = z.object({
  display_name: z.string().min(2, 'Tên tối thiểu 2 ký tự').max(30, 'Tên tối đa 30 ký tự'),
  bio: z.string().max(160, 'Bio tối đa 160 ký tự').optional(),
})

export type EditProfileInput = z.infer<typeof editProfileSchema>
