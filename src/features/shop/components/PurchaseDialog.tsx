'use client'
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui'

export function PurchaseDialog({
  title,
  pricePoints,
  userBalance,
  action,
}: {
  title: string
  pricePoints: number
  userBalance: number
  action: (formData: FormData) => void | Promise<void>
}) {
  const canAfford = userBalance >= pricePoints
  const remaining = userBalance - pricePoints

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="coin" fullWidth disabled={!canAfford}>
          {canAfford
            ? `Mua bằng ${pricePoints.toLocaleString('vi-VN')} điểm`
            : 'Không đủ điểm'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle className="text-h3 font-semibold">Mua “{title}”?</DialogTitle>
        <DialogDescription className="mt-1 text-sm text-muted-foreground">
          Bạn sẽ dùng {pricePoints.toLocaleString('vi-VN')} điểm. Số dư còn lại:{' '}
          {remaining.toLocaleString('vi-VN')} điểm.
        </DialogDescription>
        <div className="mt-4 flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="ghost">Hủy</Button>
          </DialogClose>
          <form action={action}>
            <Button type="submit" variant="coin">
              Xác nhận mua
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
