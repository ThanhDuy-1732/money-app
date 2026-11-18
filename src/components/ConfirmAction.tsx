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

export function ConfirmAction({
  trigger,
  title,
  description,
  confirmLabel,
  action,
  variant = 'destructive',
}: {
  trigger: string
  title: string
  description: string
  confirmLabel: string
  action: (formData: FormData) => void | Promise<void>
  variant?: 'destructive' | 'outline'
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant={variant}>
          {trigger}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle className="text-h3 font-semibold">{title}</DialogTitle>
        <DialogDescription className="mt-1 text-sm text-muted-foreground">
          {description}
        </DialogDescription>
        <div className="mt-4 flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="ghost">Hủy</Button>
          </DialogClose>
          <form action={action}>
            <Button type="submit" variant={variant}>
              {confirmLabel}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
