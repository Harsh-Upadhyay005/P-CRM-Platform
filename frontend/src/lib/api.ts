import axios, { AxiosError } from 'axios';
import { User, Complaint, Department, Notification, Tenant, AuditLog, Note, Attachment, PaginatedResponse } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;
    
    // If 401 and not already retrying, try to refresh token
    // Exclude login and refresh endpoints to prevent infinite loops
    // Also skip entirely if we're already on an auth page (no point refreshing)
    const onAuthPage = typeof window !== 'undefined' && (
      window.location.pathname.startsWith('/login') ||
      window.location.pathname.startsWith('/register') ||
      window.location.pathname.startsWith('/signup') ||
      window.location.pathname.startsWith('/forgot-password') ||
      window.location.pathname.startsWith('/verify-email') ||
      window.location.pathname.startsWith('/resend-verification')
    );
    if (
      error.response?.status === 401 && 
      originalRequest && 
      !onAuthPage &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !('_retry' in originalRequest)
    ) {
      (originalRequest as { _retry?: boolean })._retry = true;
      
      try {
        await api.post('/auth/refresh');
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed — clear server-side cookies then go to login.
        // Calling logout first ensures the Next.js middleware won't see a
        // stale accessToken cookie and bounce the user back to /dashboard.
        try {
          await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' });
        } catch { /* best-effort */ }
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export interface ApiResponse<T = unknown> {
  statusCode: number;
  data: T;
  message: string;
  success: boolean;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  success: boolean;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  tenantSlug: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
}

// Auth API functions
export const authApi = {
  register: async (data: RegisterPayload): Promise<ApiResponse<User>> => {
    const response = await api.post<ApiResponse<User>>('/auth/register', data);
    return response.data;
  },

  login: async (data: LoginPayload): Promise<ApiResponse<LoginResponse>> => {
    const response = await api.post<ApiResponse<LoginResponse>>('/auth/login', data);
    return response.data;
  },

  getMe: async (): Promise<ApiResponse<User>> => {
    const response = await api.get<ApiResponse<User>>('/users/me');
    return response.data;
  },

  logout: async (): Promise<ApiResponse<null>> => {
    const response = await api.post<ApiResponse<null>>('/auth/logout');
    return response.data;
  },

  refresh: async (): Promise<ApiResponse<null>> => {
    const response = await api.post<ApiResponse<null>>('/auth/refresh');
    return response.data;
  },

  verifyEmail: async (token: string): Promise<ApiResponse<null>> => {
    const response = await api.post<ApiResponse<null>>('/auth/verify-email', { token });
    return response.data;
  },

  resendVerification: async (email: string): Promise<ApiResponse<null>> => {
    const response = await api.post<ApiResponse<null>>('/auth/resend-verification', { email });
    return response.data;
  },

  forgotPassword: async (email: string): Promise<ApiResponse<null>> => {
    const response = await api.post<ApiResponse<null>>('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token: string, newPassword: string): Promise<ApiResponse<null>> => {
    const response = await api.post<ApiResponse<null>>('/auth/reset-password', { token, newPassword });
    return response.data;
  },
};

// ─── Complaints API ───────────────────────────────────────────────────────────
export const complaintsApi = {
  list: async (params?: Record<string, string | number | undefined>) => {
    const response = await api.get<ApiResponse<PaginatedResponse<Complaint>>>('/complaints', { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get<ApiResponse<Complaint>>(`/complaints/${id}`);
    return response.data;
  },
  create: async (data: Record<string, unknown>) => {
    const response = await api.post<ApiResponse<Complaint>>('/complaints', data);
    return response.data;
  },
  update: async (id: string, data: Record<string, unknown>) => {
    const response = await api.patch<ApiResponse<Complaint>>(`/complaints/${id}`, data);
    return response.data;
  },
  assign: async (id: string, officerId: string) => {
    const response = await api.patch<ApiResponse<Complaint>>(`/complaints/${id}/assign`, { assignedToId: officerId });
    return response.data;
  },
  updateStatus: async (id: string, status: string, note?: string) => {
    const response = await api.patch<ApiResponse<Complaint>>(`/complaints/${id}/status`, { status, note });
    return response.data;
  },
  addNote: async (id: string, note: string) => {
    const response = await api.post<ApiResponse<Note>>(`/complaints/${id}/notes`, { note });
    return response.data;
  },
  getNotes: async (id: string) => {
    const response = await api.get<ApiResponse<Note[]>>(`/complaints/${id}/notes`);
    return response.data;
  },
  getAttachments: async (id: string) => {
    const response = await api.get<ApiResponse<Attachment[]>>(`/complaints/${id}/attachments`);
    return response.data;
  },
  uploadAttachment: async (id: string, file: File) => {
    const form = new FormData();
    form.append('files', file); // backend: uploadMiddleware.array("files", 5)
    const response = await api.post<ApiResponse<Attachment[]>>(`/complaints/${id}/attachments`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  deleteAttachment: async (complaintId: string, attachmentId: string) => {
    const response = await api.delete<ApiResponse<null>>(`/complaints/${complaintId}/attachments/${attachmentId}`);
    return response.data;
  },
  deleteComplaint: async (id: string) => {
    const response = await api.delete<ApiResponse<null>>(`/complaints/${id}`);
    return response.data;
  },
  getFeedback: async (id: string) => {
    const response = await api.get<ApiResponse<{ rating: number; comment?: string; createdAt: string } | null>>(`/complaints/${id}/feedback`);
    return response.data;
  },
  track: async (trackingId: string) => {
    const response = await api.get<ApiResponse<Complaint>>(`/complaints/track/${trackingId}`);
    return response.data;
  },
  createPublic: async (data: Record<string, unknown>) => {
    const response = await api.post<ApiResponse<{ trackingId: string }>>('/complaints/public', data);
    return response.data;
  },
  submitFeedback: async (trackingId: string, data: { rating: number; comment?: string }) => {
    const response = await api.post<ApiResponse<null>>(`/complaints/feedback/${trackingId}`, data);
    return response.data;
  },
};

// ─── Users API ────────────────────────────────────────────────────────────────
export const usersApi = {
  list: async (params?: Record<string, string | number | undefined>) => {
    const response = await api.get<ApiResponse<PaginatedResponse<User>>>('/users', { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get<ApiResponse<User>>(`/users/${id}`);
    return response.data;
  },
  updateMe: async (data: Record<string, unknown>) => {
    const response = await api.patch<ApiResponse<User>>('/users/me', data);
    return response.data;
  },
  assignRole: async (id: string, role: string) => {
    const response = await api.patch<ApiResponse<User>>(`/users/${id}/role`, { role });
    return response.data;
  },
  setStatus: async (id: string, isActive: boolean) => {
    const response = await api.patch<ApiResponse<User>>(`/users/${id}/status`, { isActive });
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete<ApiResponse<null>>(`/users/${id}`);
    return response.data;
  },
};

// ─── Departments API ──────────────────────────────────────────────────────────
export const departmentsApi = {
  list: async (params?: Record<string, string | number | undefined>) => {
    const response = await api.get<ApiResponse<PaginatedResponse<Department>>>('/departments', { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get<ApiResponse<Department>>(`/departments/${id}`);
    return response.data;
  },
  create: async (data: { name: string; slug?: string; slaHours?: number }) => {
    const response = await api.post<ApiResponse<Department>>('/departments', data);
    return response.data;
  },
  update: async (id: string, data: Record<string, unknown>) => {
    const response = await api.patch<ApiResponse<Department>>(`/departments/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete<ApiResponse<null>>(`/departments/${id}`);
    return response.data;
  },
};

// ─── Analytics API ────────────────────────────────────────────────────────────
export interface AnalyticsOverview {
  totalComplaints: number;
  openComplaints: number;
  resolvedComplaints: number;
  avgResolutionHours: number;
  slaBreachedCount: number;
  escalatedCount: number;
  [key: string]: unknown;
}
export interface TrendPoint { date: string; complaints: number; resolved: number }
export interface DeptStat { department: string; total: number; resolved: number; avgHours: number }
export interface OfficerStat { name: string; assigned: number; completed: number; avgHours: number; satisfaction: number }
export interface SlaHeatmapPoint { hour: number; day: string; count: number }
export interface EscalationPoint { date: string; escalations: number }
export interface CategoryPoint { name: string; value: number; fill: string }

export const analyticsApi = {
  getOverview: async (startDate?: string, endDate?: string) => {
    const params: Record<string, string> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const response = await api.get<ApiResponse<AnalyticsOverview>>('/analytics/overview', { params });
    return response.data;
  },
  getTrends: async (days: number = 30) => {
    const response = await api.get<ApiResponse<TrendPoint[]>>('/analytics/trends', { params: { days } });
    return response.data;
  },
  getDepartmentStats: async (startDate?: string, endDate?: string) => {
    const params: Record<string, string> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const response = await api.get<ApiResponse<DeptStat[]>>('/analytics/departments', { params });
    return response.data;
  },
  getOfficerLeaderboard: async () => {
    const response = await api.get<ApiResponse<OfficerStat[]>>('/analytics/officers');
    return response.data;
  },
  getSlaHeatmap: async () => {
    const response = await api.get<ApiResponse<SlaHeatmapPoint[]>>('/analytics/sla-heatmap');
    return response.data;
  },
  getEscalationTrends: async (days: number = 30) => {
    const response = await api.get<ApiResponse<EscalationPoint[]>>('/analytics/escalation-trends', { params: { days } });
    return response.data;
  },
  getCategoryDistribution: async () => {
    const response = await api.get<ApiResponse<CategoryPoint[]>>('/analytics/category-distribution');
    return response.data;
  },
};

// ─── Notifications API ────────────────────────────────────────────────────────
export const notificationsApi = {
  list: async (params?: { page?: number; limit?: number }) => {
    const response = await api.get<ApiResponse<PaginatedResponse<Notification>>>('/notifications', { params });
    return response.data;
  },
  getUnreadCount: async () => {
    const response = await api.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
    return response.data;
  },
  markRead: async (id: string) => {
    const response = await api.patch<ApiResponse<Notification>>(`/notifications/${id}/read`);
    return response.data;
  },
  markAllRead: async () => {
    const response = await api.patch<ApiResponse<null>>('/notifications/read-all');
    return response.data;
  },
};

// ─── Audit Logs API ───────────────────────────────────────────────────────────
export const auditLogsApi = {
  getLogs: async (params?: Record<string, string | number | undefined>) => {
    const response = await api.get<ApiResponse<PaginatedResponse<AuditLog>>>('/audit-logs', { params });
    return response.data;
  },
  getActions: async () => {
    const response = await api.get<ApiResponse<string[]>>('/audit-logs/actions');
    return response.data;
  },
};

// ─── Tenants API ──────────────────────────────────────────────────────────────
export const tenantsApi = {
  list: async (params?: Record<string, string | number | undefined>) => {
    const response = await api.get<ApiResponse<PaginatedResponse<Tenant>>>('/tenants', { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get<ApiResponse<Tenant>>(`/tenants/${id}`);
    return response.data;
  },
  create: async (data: { name: string; slug: string }) => {
    const response = await api.post<ApiResponse<Tenant>>('/tenants', data);
    return response.data;
  },
  update: async (id: string, data: Record<string, unknown>) => {
    const response = await api.patch<ApiResponse<Tenant>>(`/tenants/${id}`, data);
    return response.data;
  },
  deactivate: async (id: string) => {
    const response = await api.delete<ApiResponse<null>>(`/tenants/${id}`);
    return response.data;
  },
};

// ─── Helper ───────────────────────────────────────────────────────────────────
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    return axiosError.response?.data?.message || axiosError.message || 'An error occurred';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

export default api;
