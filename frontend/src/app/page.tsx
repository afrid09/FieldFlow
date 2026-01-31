'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { 
  MapPin, 
  Sprout, 
  TrendingUp, 
  AlertTriangle,
  Bell,
  Plus,
  Search,
  Filter
} from 'lucide-react';
import { dashboardApi, fieldApi, notificationApi } from '@/lib/api';
import { DashboardStats, FieldSummary, Notification } from '@/types';
import FieldCard from '@/components/FieldCard';
import StatsCard from '@/components/StatsCard';
import NotificationPanel from '@/components/NotificationPanel';
import FieldMap from '@/components/FieldMap';
import RecentActivity from '@/components/RecentActivity';

export default function Dashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_role');
    localStorage.removeItem('auth_user_id');
    router.push('/login');
  };

  // Fetch dashboard stats
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await dashboardApi.getStats();
      return response.data;
    },
  });

  // Fetch fields
  const { data: fields, isLoading: fieldsLoading } = useQuery<FieldSummary[]>({
    queryKey: ['fields'],
    queryFn: async () => {
      const response = await fieldApi.getAll();
      return response.data;
    },
  });

  // Fetch notifications
  const { data: notifications } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await notificationApi.getAll();
      return response.data;
    },
  });

  const filteredFields = fields?.filter((field) =>
    field.fieldName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Sprout className="h-8 w-8 text-primary-600" />
              <h1 className="text-2xl font-bold text-gray-900">FieldFlow</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Bell className="h-6 w-6" />
                {(notifications?.filter((n) => !n.isRead).length ?? 0) > 0 && (
                  <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                    {notifications?.filter((n) => !n.isRead).length}
                  </span>
                )}
              </button>

              <button
                onClick={handleLogout}
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Logout
              </button>
              
              <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2">
                <Plus className="h-5 w-5" />
                <span>Add Field</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Fields"
            value={stats?.totalFields ?? 0}
            icon={<MapPin className="h-6 w-6" />}
            color="blue"
          />
          <StatsCard
            title="Total Area"
            value={`${stats?.totalArea?.toFixed(1) ?? 0} ha`}
            icon={<Sprout className="h-6 w-6" />}
            color="green"
          />
          <StatsCard
            title="Active Fields"
            value={stats?.activeFields ?? 0}
            icon={<TrendingUp className="h-6 w-6" />}
            color="purple"
          />
          <StatsCard
            title="Fields at Risk"
            value={stats?.fieldsAtRisk ?? 0}
            icon={<AlertTriangle className="h-6 w-6" />}
            color="red"
          />
        </div>

        {/* Map and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Field Locations
              </h2>
              <div className="h-96 rounded-lg overflow-hidden">
                <FieldMap fields={fields ?? []} />
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-1">
            <RecentActivity />
          </div>
        </div>

        {/* Fields List */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Your Fields</h2>
              <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
                <Filter className="h-5 w-5" />
                <span className="text-sm">Filter</span>
              </button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search fields..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="p-6">
            {fieldsLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading fields...</p>
              </div>
            ) : filteredFields && filteredFields.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredFields.map((field) => (
                  <FieldCard key={field.fieldId} field={field} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Sprout className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No fields found</p>
                <button className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                  Add Your First Field
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Notification Panel */}
      {showNotifications && (
        <NotificationPanel
          notifications={notifications ?? []}
          onClose={() => setShowNotifications(false)}
        />
      )}
    </div>
  );
}
