import { listUsers, lockUser, unlockUser } from '@/features/admin/actions/moderation.actions'

export default async function AdminUsersPage() {
  const users = await listUsers()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Người dùng ({users.length})</h1>
      <div className="border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="text-left p-3">Tên</th>
              <th className="text-left p-3">Username</th>
              <th className="text-right p-3">Điểm</th>
              <th className="text-left p-3">Role</th>
              <th className="text-left p-3">Trạng thái</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map(u => (
              <tr key={u.id} className={u.locked ? 'opacity-50' : ''}>
                <td className="p-3">{u.display_name}</td>
                <td className="p-3 text-gray-500">@{u.username}</td>
                <td className="p-3 text-right">{u.points_balance}</td>
                <td className="p-3">{u.role}</td>
                <td className="p-3">{u.locked ? '🔒 Khoá' : '✅ Hoạt động'}</td>
                <td className="p-3">
                  {u.role !== 'admin' && (
                    <form action={u.locked ? unlockUser.bind(null, u.id) : lockUser.bind(null, u.id)}>
                      <button className="text-xs text-red-600 hover:underline">
                        {u.locked ? 'Mở khoá' : 'Khoá'}
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
