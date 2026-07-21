import React, { useEffect, useState } from 'react';
import { Plus, Trash2, UserCheck, UserX, Shield } from 'lucide-react';
import { useAdminUsers } from '../../hooks/useAdminUsers';
import { useToast } from '../ui/Toast';
import {
  Card, PageHeader, Button, IconButton, Badge, Field, Input, Modal,
  TableShell, Thead, Th, Td, EmptyState, Spinner,
} from './ui/Kit';

export function AdminUserManagement() {
  const { adminUsers, loading, error, addAdminUser, removeAdminUser, toggleAdminStatus } = useAdminUsers();
  const { success: toastSuccess, error: toastError } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [email, setEmail] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Surface hook errors (add/remove/toggle failures) as toasts
  useEffect(() => {
    if (error) {
      toastError(error);
    }
  }, [error, toastError]);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);

    const success = await addAdminUser(email);
    if (success) {
      toastSuccess('Admin user added successfully.');
      setEmail('');
      setShowAddForm(false);
    }

    setAddLoading(false);
  };

  const handleRemoveAdmin = async (adminId: string) => {
    const success = await removeAdminUser(adminId);
    if (success) {
      toastSuccess('Admin user removed.');
    }
  };

  const handleToggleStatus = async (adminId: string, isActive: boolean) => {
    const success = await toggleAdminStatus(adminId, isActive);
    if (success) {
      toastSuccess(isActive ? 'Admin activated.' : 'Admin deactivated.');
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin User Management"
        subtitle="Manage admin access and permissions"
        actions={<Button icon={Plus} onClick={() => setShowAddForm(true)}>Add Admin</Button>}
      />

      {/* Admin Users List */}
      <Card padded={false}>
        <div className="p-6 pb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Admin Users</h2>
        </div>

        {adminUsers.length === 0 ? (
          <EmptyState icon={Shield} title="No admin users found" />
        ) : (
          <TableShell>
            <Thead>
              <Th>User</Th>
              <Th>Status</Th>
              <Th>Added Date</Th>
              <Th align="end">Actions</Th>
            </Thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {adminUsers.map((admin) => (
                <tr key={admin.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="bg-primary-100 dark:bg-primary-900/50 p-2 rounded-lg flex-shrink-0">
                        <Shield className="text-primary-600 dark:text-primary-400" size={18} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{admin.email}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Admin User</div>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <Badge tone={admin.is_active ? 'success' : 'danger'}>{admin.is_active ? 'Active' : 'Inactive'}</Badge>
                  </Td>
                  <Td className="text-gray-500 dark:text-gray-400">{new Date(admin.created_at).toLocaleDateString()}</Td>
                  <Td align="end">
                    <div className="flex items-center justify-end gap-0.5">
                      <IconButton
                        icon={admin.is_active ? UserX : UserCheck}
                        label={admin.is_active ? 'Deactivate admin' : 'Activate admin'}
                        tone={admin.is_active ? 'danger' : 'primary'}
                        onClick={() => handleToggleStatus(admin.id, !admin.is_active)}
                      />
                      <IconButton icon={Trash2} label="Remove admin" tone="danger" onClick={() => handleRemoveAdmin(admin.id)} />
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Card>

      {/* Add Admin Modal */}
      <Modal open={showAddForm} onClose={() => { setShowAddForm(false); setEmail(''); }} title="Add Admin User" maxWidth="max-w-md">
        <form onSubmit={handleAddAdmin} className="space-y-4">
          <Field label="Email Address" helper="User must already have an account to be made an admin">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              required
            />
          </Field>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => { setShowAddForm(false); setEmail(''); }} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={addLoading} className="flex-1">Add Admin</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
