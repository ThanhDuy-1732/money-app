import { notFound } from 'next/navigation'
import {
  Amount,
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  EmptyState,
  Field,
  Input,
  Note,
  PageHeader,
  Progress,
  Section,
  Select,
  Serial,
  Skeleton,
  Stamp,
  Stat,
  Textarea,
} from '@/components/ui'
import { PlaygroundClient } from './playground-client'

export default function DesignPage() {
  if (process.env.NODE_ENV === 'production') notFound()

  return (
    <main className="mx-auto max-w-default space-y-10 px-4 py-8">
      <PageHeader
        title="Design system"
        description="Polymer Ledger — token, typography, components và pattern của toàn app."
        meta="Chỉ hiển thị ở môi trường dev"
      />

      <Section title="Màu">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Giấy', 'bg-background text-foreground border-border'],
            ['Mực', 'bg-ink text-background'],
            ['Lá', 'bg-leaf text-primary-foreground'],
            ['Sen', 'bg-lotus text-destructive-foreground'],
            ['Xu', 'bg-coin text-accent-foreground'],
            ['Card', 'bg-card text-card-foreground border-border'],
            ['Muted', 'bg-muted text-muted-foreground'],
            ['Security', 'bg-secondary text-secondary-foreground'],
          ].map(([label, className]) => (
            <div key={label} className={`rounded-lg border p-4 text-sm font-semibold ${className}`}>
              {label}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <div className="space-y-3">
          <p className="text-display font-extrabold tracking-tight">Display 48</p>
          <p className="text-h1 font-extrabold tracking-tight">Heading 1 · 32</p>
          <p className="text-h2 font-bold">Heading 2 · 24</p>
          <p className="text-h3 font-semibold">Heading 3 · 18</p>
          <p className="text-body text-muted-foreground">Body 15 · Quản lý tiền của bạn, và được thưởng vì làm điều đó.</p>
          <p className="text-sm text-muted-foreground">Small 13 · Giao dịch gần đây</p>
          <p className="text-micro font-bold uppercase tracking-[0.14em] text-muted-foreground">Micro · Số seri</p>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Nạp điểm</Button>
          <Button variant="secondary">Phụ</Button>
          <Button variant="outline">Viền</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="coin">Đổi quà</Button>
          <Button variant="destructive">Xóa</Button>
          <Button variant="link">Liên kết</Button>
          <Button loading>Đang lưu</Button>
          <Button size="sm">Nhỏ</Button>
          <Button size="lg">Lớn</Button>
        </div>
      </Section>

      <Section title="Fields">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Email" htmlFor="demo-email" hint="Dùng email thật để nhận OTP.">
            <Input id="demo-email" placeholder="ban@example.com" />
          </Field>
          <Field label="Email" htmlFor="demo-email-error" error="Email không hợp lệ.">
            <Input id="demo-email-error" invalid defaultValue="sai" />
          </Field>
          <Field label="Ghi chú" htmlFor="demo-note">
            <Textarea id="demo-note" placeholder="Viết gì đó..." />
          </Field>
          <Field label="Danh mục" htmlFor="demo-category">
            <Select id="demo-category" defaultValue="food">
              <option value="food">Ăn uống</option>
              <option value="move">Di chuyển</option>
            </Select>
          </Field>
        </div>
      </Section>

      <Section title="Cards, badges, avatars">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Card mặc định</CardTitle>
              <CardDescription>Nền giấy, viền mảnh, không shadow.</CardDescription>
            </CardHeader>
            <CardBody className="text-sm text-muted-foreground">Nội dung card.</CardBody>
            <CardFooter>
              <Button size="sm">Hành động</Button>
            </CardFooter>
          </Card>
          <Card tone="coin">
            <CardHeader>
              <CardTitle>Card xu</CardTitle>
              <CardDescription>Dùng cho điểm thưởng, Premium.</CardDescription>
            </CardHeader>
            <CardBody>
              <Amount value={1250} kind="points" tone="coin" />
            </CardBody>
          </Card>
          <Card tone="lotus">
            <CardHeader>
              <CardTitle>Card sen</CardTitle>
              <CardDescription>Dùng cho chi tiêu, cảnh báo.</CardDescription>
            </CardHeader>
            <CardBody>
              <Amount value={-150} kind="points" tone="lotus" />
            </CardBody>
          </Card>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Badge variant="neutral">Trung tính</Badge>
          <Badge variant="leaf">Lá</Badge>
          <Badge variant="lotus">Sen</Badge>
          <Badge variant="coin">Xu</Badge>
          <Badge variant="premium">Premium</Badge>
          <Badge variant="outline">Viền</Badge>
          <Avatar fallback="Minh Anh" size="sm" />
          <Avatar fallback="Minh Anh" size="md" />
          <Avatar fallback="Minh Anh" size="lg" />
          <Avatar fallback="Minh Anh" size="xl" ring />
        </div>
      </Section>

      <Section title="Tabs, segmented, progress, skeleton">
        <PlaygroundClient />
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Progress lá</p>
            <Progress value={62} />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Progress xu</p>
            <Progress value={78} tone="coin" />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Progress sen</p>
            <Progress value={95} tone="lotus" />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Skeleton />
          <Skeleton variant="row" />
          <Skeleton variant="card" />
        </div>
      </Section>

      <Section title="Stat và empty state">
        <div className="grid gap-4 md:grid-cols-2">
          <Stat label="Thu nhập" value="+18.500.000đ" tone="leaf" delta="Tháng 11" />
          <Stat label="Chi tiêu" value="−11.240.000đ" tone="lotus" delta="Tháng 11" />
        </div>
        <EmptyState
          className="mt-4"
          title="Chưa có giao dịch"
          description="Nạp điểm hoặc thêm giao dịch đầu tiên để bắt đầu."
          action={<Button>Thêm giao dịch</Button>}
        />
      </Section>

      <Section title="Amount, serial, stamp">
        <div className="flex flex-wrap items-center gap-6">
          <Amount value={1250} kind="points" size="xl" />
          <Amount value={50000} kind="vnd" size="lg" />
          <Amount value={18500000} kind="vnd" sign="plus" tone="leaf" />
          <Amount value={11240000} kind="vnd" sign="minus" tone="lotus" />
          <Serial value="7f2a19c4" label="SERI" copyable />
          <Stamp status="Đã đổi" tone="leaf" />
          <Stamp status="Chờ xử lý" tone="coin" />
          <Stamp status="Thất bại" tone="lotus" />
        </div>
      </Section>

      <Section title="The Note">
        <div className="max-w-md">
          <Note points={1250} serial="0042 8817" streak={7} rank="Người khai phá" />
        </div>
      </Section>
    </main>
  )
}
