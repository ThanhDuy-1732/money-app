import { z } from 'zod'

export const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount_vnd: z.number().int().positive('Số tiền phải lớn hơn 0'),
  category_id: z.string().uuid().optional(),
  note: z.string().max(200, 'Ghi chú tối đa 200 ký tự').optional(),
  occurred_at: z.string().optional(), // ISO date string YYYY-MM-DD
})

export const budgetSchema = z.object({
  category_id: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}-01$/, 'month phải ở dạng YYYY-MM-01'),
  limit_amount: z.number().int().positive('Hạn mức phải lớn hơn 0'),
})

export const savingsGoalSchema = z.object({
  name: z.string().min(1, 'Tên mục tiêu không được để trống').max(60, 'Tối đa 60 ký tự'),
  target_amount: z.number().int().positive('Mục tiêu phải lớn hơn 0'),
  target_date: z.string().optional(), // ISO date string YYYY-MM-DD
})

export const savingsProgressSchema = z.object({
  id: z.string().uuid(),
  current_amount: z.number().int().min(0),
})

export const noteSchema = z.object({
  title: z.string().max(100, 'Tiêu đề tối đa 100 ký tự').optional(),
  content: z.string().max(5000, 'Nội dung tối đa 5000 ký tự').optional(),
})

export const todoSchema = z.object({
  title: z.string().min(1, 'Tiêu đề không được để trống').max(200, 'Tối đa 200 ký tự'),
  due_date: z.string().optional(), // ISO date string YYYY-MM-DD
})

export const giftPointsSchema = z.object({
  amount: z.number().int().positive('Số điểm phải lớn hơn 0').max(200, 'Tối đa 200 điểm/lần tặng'),
})

export const goalContributionSchema = z.object({
  amount: z.number().int().positive('Khoản góp phải lớn hơn 0'),
})

export const recurringSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount_vnd: z.number().int().positive('Số tiền phải lớn hơn 0'),
  category_id: z.string().uuid().optional(),
  note: z.string().max(200).optional(),
  start_date: z.iso.date('Ngày không hợp lệ'),
})

export type TransactionInput = z.infer<typeof transactionSchema>
export type BudgetInput = z.infer<typeof budgetSchema>
export type SavingsGoalInput = z.infer<typeof savingsGoalSchema>
export type NoteInput = z.infer<typeof noteSchema>
export type TodoInput = z.infer<typeof todoSchema>
