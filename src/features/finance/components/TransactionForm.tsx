'use client'
import { useState } from 'react'
import { Button, Field, Input, Segmented, Select, Textarea } from '@/components/ui'
import { todayIso } from '@/lib/date'

type Category = { id: string; name: string; icon: string | null; type: string }

export function TransactionForm({
  categories,
  action,
}: {
  categories: Category[]
  action: (formData: FormData) => void | Promise<void>
}) {
  const [type, setType] = useState('expense')

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="type" value={type} />

      <div>
        <p className="mb-2 text-sm font-semibold">Loại giao dịch</p>
        <Segmented
          options={[
            { value: 'expense', label: 'Chi tiêu' },
            { value: 'income', label: 'Thu nhập' },
          ]}
          value={type}
          onValueChange={setType}
        />
      </div>

      <Field label="Số tiền" htmlFor="amount" hint="Đơn vị: VNĐ">
        <Input
          id="amount"
          name="amount_vnd"
          type="number"
          min="1"
          step="1000"
          required
          placeholder="50000"
          className="text-right tabular"
        />
      </Field>

      <Field label="Danh mục" htmlFor="category">
        <Select id="category" name="category_id" defaultValue="">
          <option value="">Không phân loại</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Ngày" htmlFor="date">
        <Input
          id="date"
          name="occurred_at"
          type="date"
          defaultValue={todayIso()}
        />
      </Field>

      <Field label="Ghi chú" htmlFor="note">
        <Textarea id="note" name="note" maxLength={200} placeholder="Tùy chọn" />
      </Field>

      <div className="sticky bottom-20 md:static">
        <Button type="submit" fullWidth>
          Lưu giao dịch
        </Button>
      </div>
    </form>
  )
}
