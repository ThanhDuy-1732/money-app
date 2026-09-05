import { z } from 'zod'

export const postSchema = z.object({
  content: z.string().max(500, 'Nội dung tối đa 500 ký tự').optional(),
  image_urls: z.array(z.string().url()).max(4, 'Tối đa 4 ảnh').default([]),
}).refine(
  data => (data.content && data.content.trim().length > 0) || data.image_urls.length > 0,
  { message: 'Bài đăng phải có nội dung hoặc ảnh' }
)

export type PostInput = z.infer<typeof postSchema>
