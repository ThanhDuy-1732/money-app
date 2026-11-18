import { listUsers, lockUser, unlockUser } from '@/features/admin/actions/moderation.actions'
import { ConfirmAction } from '@/components/ConfirmAction'
import {
  Badge,
  EmptyState,
  Section,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/components/ui'

export default async function AdminUsersPage() {
  const users = await listUsers()

  return (
    <div data-testid="admin-users" className="space-y-4">
      <Section title={`Người dùng (${users.length})`}>
        {users.length === 0 ? (
          <EmptyState title="Chưa có người dùng" description="Người dùng sẽ xuất hiện ở đây." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Tên</TH>
                <TH>Username</TH>
                <TH className="text-right">Điểm</TH>
                <TH>Vai trò</TH>
                <TH>Trạng thái</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {users.map(user => (
                <TR key={user.id} className={user.locked ? 'opacity-60' : ''}>
                  <TD className="font-medium">{user.display_name}</TD>
                  <TD className="text-muted-foreground">@{user.username ?? '—'}</TD>
                  <TD className="text-right tabular">
                    {user.points_balance.toLocaleString('vi-VN')}
                  </TD>
                  <TD>
                    <Badge variant={user.role === 'admin' ? 'premium' : 'neutral'}>
                      {user.role === 'admin' ? 'Quản trị' : 'Người dùng'}
                    </Badge>
                  </TD>
                  <TD>
                    <Badge variant={user.locked ? 'lotus' : 'leaf'}>
                      {user.locked ? 'Đã khóa' : 'Hoạt động'}
                    </Badge>
                  </TD>
                  <TD className="text-right">
                    {user.role !== 'admin' && (
                      <ConfirmAction
                        trigger={user.locked ? 'Mở khóa' : 'Khóa'}
                        title={
                          user.locked
                            ? `Mở khóa ${user.display_name}?`
                            : `Khóa ${user.display_name}?`
                        }
                        description={
                          user.locked
                            ? 'Người dùng sẽ có thể đăng nhập lại.'
                            : 'Người dùng sẽ bị đăng xuất và không thể truy cập.'
                        }
                        confirmLabel={user.locked ? 'Mở khóa' : 'Khóa'}
                        action={
                          user.locked
                            ? unlockUser.bind(null, user.id)
                            : lockUser.bind(null, user.id)
                        }
                        variant={user.locked ? 'outline' : 'destructive'}
                      />
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Section>
    </div>
  )
}
