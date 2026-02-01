import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API Methods
export const fieldApi = {
  getAll: () => api.get('/api/fields'),
  getById: (id: string) => api.get(`/api/fields/${id}`),
  create: (data: any) => api.post('/api/fields', data),
  update: (id: string, data: any) => api.put(`/api/fields/${id}`, data),
  delete: (id: string) => api.delete(`/api/fields/${id}`),
  getSummary: (id: string) => api.get(`/api/fields/${id}/summary`),
  getByBbox: (params: { minLat: number; minLon: number; maxLat: number; maxLon: number; limit?: number }) =>
    api.get('/api/fields/bbox', { params }),
  getByNearby: (params: { lat: number; lon: number; radiusMeters: number; limit?: number }) =>
    api.get('/api/fields/nearby', { params }),
  getByPolygon: (data: { polygon: any; limit?: number }) => api.post('/api/fields/polygon', data),
};

export const soilApi = {
  getByFieldId: (fieldId: string) => api.get(`/api/soil/${fieldId}`),
  getLatest: (fieldId: string) => api.get(`/api/soil/${fieldId}/latest`),
  create: (data: any) => api.post('/api/soil', data),
};

export const weatherApi = {
  getByFieldId: (fieldId: string) => api.get(`/api/weather/${fieldId}`),
  getLatest: (fieldId: string) => api.get(`/api/weather/${fieldId}/latest`),
  getForecast: (fieldId: string) => api.get(`/api/weather/${fieldId}/forecast`),
};

export const analysisApi = {
  getByFieldId: (fieldId: string) => api.get(`/api/analysis/${fieldId}`),
  getLatest: (fieldId: string) => api.get(`/api/analysis/${fieldId}/latest`),
  trigger: (fieldId: string) => api.post(`/api/analysis/${fieldId}/trigger`),
};

export const notificationApi = {
  getAll: () => api.get('/api/notifications'),
  markAsRead: (id: string) => api.put(`/api/notifications/${id}/read`),
  markAllAsRead: () => api.put('/api/notifications/read-all'),
};

export const dashboardApi = {
  getStats: () => api.get('/api/dashboard/stats'),
  getRecentActivity: () => api.get('/api/dashboard/activity'),
};

export const authApi = {
  login: (data: { email: string; password: string }) => api.post('/api/auth/login', data),
  register: (data: { email: string; fullName: string; password: string; role?: string }) =>
    api.post('/api/auth/register', data),
};

export const adminApi = {
  getUsers: () => api.get('/api/admin/users'),
  updateUserRole: (userId: string, role: string) => api.put(`/api/admin/users/${userId}/role`, { role }),
  updateUserStatus: (userId: string, isActive: boolean) =>
    api.put(`/api/admin/users/${userId}/status`, { isActive }),
  getAuditLogs: () => api.get('/api/admin/audit'),
};
