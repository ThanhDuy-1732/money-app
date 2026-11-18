'use client'
import { useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  Segmented,
  Sheet,
  Tabs,
} from '@/components/ui'

export function PlaygroundClient() {
  const [tab, setTab] = useState('all')
  const [segment, setSegment] = useState('all')
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <div className="space-y-6">
      <Tabs
        items={[
          { value: 'all', label: 'Tất cả', count: 12 },
          { value: 'in', label: 'Nhận' },
          { value: 'out', label: 'Chi' },
        ]}
        value={tab}
        onValueChange={setTab}
      />

      <Segmented
        options={[
          { value: 'all', label: 'Tất cả' },
          { value: 'month', label: 'Tháng này' },
        ]}
        value={segment}
        onValueChange={setSegment}
      />

      <div className="flex flex-wrap gap-3">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Mở dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle className="text-h3 font-semibold">Dialog mẫu</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              Dùng cho xác nhận đổi quà, khóa user, hoặc mua sản phẩm.
            </DialogDescription>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost">Hủy</Button>
              <Button>Xác nhận</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="outline" onClick={() => setSheetOpen(true)}>
          Mở sheet
        </Button>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen} title="Sheet mẫu" description="Bottom sheet trên mobile, panel trên desktop.">
        <div className="space-y-2">
          <Button fullWidth>Nạp điểm</Button>
          <Button variant="outline" fullWidth>
            Đổi quà
          </Button>
        </div>
      </Sheet>
    </div>
  )
}
