'use client';
// Purpose: Admin console UI.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';

type AdminUser = {
  userId: string;
  email: string;
  fullName: string;
  role: 'admin' | 'manager' | 'farmer';
  isActive: boolean;
  createdAt: string;
};

type AuditLog = {
  auditLogId: string;
  action: string;
  targetUserId?: string;
  payload?: Record<string, unknown>;
  createdAt: string;
  actor: { userId: string; email: string };
};

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    const role = localStorage.getItem('auth_role');
    if (role !== 'admin') {
      router.replace('/');
    }
  }, [router]);

  const { data: users, refetch: refetchUsers } = useQuery<AdminUser[]>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const response = await adminApi.getUsers();
      return response.data;
    },
  });

  const { data: auditLogs } = useQuery<AuditLog[]>({
    queryKey: ['admin-audit'],
    queryFn: async () => {
      const response = await adminApi.getAuditLogs();
      return response.data;
    },
  });

  const updateRole = async (userId: string, role: AdminUser['role']) => {
    await adminApi.updateUserRole(userId, role);
    refetchUsers();
  };

  const updateStatus = async (userId: string, isActive: boolean) => {
    await adminApi.updateUserStatus(userId, isActive);
    refetchUsers();
  };

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Admin Console</h1>
          <button
            onClick={() => router.push('/')}
            className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Users</h2>
          </div>
          <div className="p-6 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Email</th>
                  <th className="pb-2">Role</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(users ?? []).map((user) => (
                  <tr key={user.userId} className="border-t">
                    <td className="py-2">{user.fullName}</td>
                    <td className="py-2">{user.email}</td>
                    <td className="py-2">
                      <select
                        value={user.role}
                        onChange={(event) => updateRole(user.userId, event.target.value as AdminUser['role'])}
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                      >
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="farmer">Farmer</option>
                      </select>
                    </td>
                    <td className="py-2">
                      <span className={user.isActive ? 'text-green-600' : 'text-red-600'}>
                        {user.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => updateStatus(user.userId, !user.isActive)}
                        className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
                      >
                        {user.isActive ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Audit Logs</h2>
          </div>
          <div className="p-6 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="pb-2">When</th>
                  <th className="pb-2">Action</th>
                  <th className="pb-2">Actor</th>
                  <th className="pb-2">Target</th>
                </tr>
              </thead>
              <tbody>
                {(auditLogs ?? []).map((log) => (
                  <tr key={log.auditLogId} className="border-t">
                    <td className="py-2">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="py-2">{log.action}</td>
                    <td className="py-2">{log.actor.email}</td>
                    <td className="py-2">{log.targetUserId ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
