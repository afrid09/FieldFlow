'use client';
// Purpose: Frontend module: RecentActivity.

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import { Activity, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function RecentActivity() {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const response = await dashboardApi.getRecentActivity();
      return response.data;
    },
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border h-full">
      <div className="p-6 border-b">
        <div className="flex items-center space-x-2">
          <Activity className="h-5 w-5 text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex space-x-4">
                <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : activities && activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((activity: any, index: number) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Clock className="h-4 w-4 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.description}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDistanceToNow(new Date(activity.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Activity className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No recent activity</p>
          </div>
        )}
      </div>
    </div>
  );
}
