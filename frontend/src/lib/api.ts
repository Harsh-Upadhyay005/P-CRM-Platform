import axios, { AxiosError } from 'axios';
import {
  User,
  Complaint,
  Department,
  Notification,
  Tenant,
  AuditLog,
  Note,
  Attachment,
  PaginatedResponse,
  WorkflowSettings,
  WorkflowAssignmentRule,
  CategorySlaPolicy,
  Priority,
} from '@/types';

/**
 * All API calls use a relative base URL (/api/v1) so they are routed through
 * the Next.js rewrite proxy defined in next.config.ts:
 *
 *   /api/v1/:path*  →  BACKEND_URL/api/v1/:path*
 *
 * This ensures the frontend-domain accessToken cookie is forwarded to the
 * backend transparently, regardless of whether the deployment is local or
 * cross-origin (Vercel frontend + Render backend).
 *
 * For server-side use inside Route Handlers we still have NEXT_PUBLIC_API_URL.
 */
const api = axios.create({
  baseURL: '/api/v1',   // relative — always routed through Next.js rewrite proxy
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Proxy API — calls Next.js Route Handlers at /api/auth/*.
 * These handlers forward to the backend AND mirror the accessToken + refreshToken
 * cookies onto the frontend domain so proxy.ts middleware can gate protected routes.
 */
const proxyApi = axios.create({
  baseURL: '',          // relative — targets the Next.js server itself
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
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
      !originalRequest.url?.includes('/api/auth/') &&
      !('_retry' in originalRequest)
    ) {
      (originalRequest as { _retry?: boolean })._retry = true;

      try {
        // Use the Next.js proxy route so the frontend-domain mirror cookie
        // is also refreshed (the backend cookie is refreshed via cookie forwarding).
        await proxyApi.post('/api/auth/refresh');
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed — clear frontend cookie then redirect to login.
        try {
          await proxyApi.post('/api/auth/logout');
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
  accessToken: string;
}

// Auth API functions
export const authApi = {
  register: async (data: RegisterPayload): Promise<ApiResponse<User>> => {
    const response = await api.post<ApiResponse<User>>('/auth/register', data);
    return response.data;
  },

  login: async (data: LoginPayload): Promise<ApiResponse<LoginResponse>> => {
    // Use the Next.js proxy so the frontend-domain accessToken cookie is set.
    const response = await proxyApi.post<ApiResponse<LoginResponse>>('/api/auth/login', data);
    return response.data;
  },

  getMe: async (): Promise<ApiResponse<User>> => {
    const response = await api.get<ApiResponse<User>>('/users/me');
    return response.data;
  },

  logout: async (): Promise<ApiResponse<null>> => {
    // Use the Next.js proxy so the frontend-domain cookie is cleared.
    const response = await proxyApi.post<ApiResponse<null>>('/api/auth/logout');
    return response.data;
  },

  refresh: async (): Promise<ApiResponse<null>> => {
    // Use the Next.js proxy so the frontend-domain cookie is refreshed.
    const response = await proxyApi.post<ApiResponse<null>>('/api/auth/refresh');
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

// ─── Download helper ─────────────────────────────────────────────────────────
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

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
  assign: async (id: string, officerId?: string, departmentId?: string) => {
    const response = await api.patch<ApiResponse<Complaint>>(`/complaints/${id}/assign`, {
      ...(officerId && { assignedToId: officerId }),
      ...(departmentId && { departmentId }),
    });
    return response.data;
  },
  updateStatus: async (id: string, status: string, note?: string) => {
    const response = await api.patch<ApiResponse<Complaint>>(`/complaints/${id}/status`, { newStatus: status, note });
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
    form.append('files', file);
    const response = await api.post<ApiResponse<Attachment[]>>(`/complaints/${id}/attachments`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  uploadPublicAttachment: async (trackingId: string, file: File) => {
    const form = new FormData();
    form.append('files', file);
    const response = await api.post<ApiResponse<Attachment[]>>(`/complaints/public/${trackingId}/attachments`, form, {
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
  searchPublicTenants: async (q: string) => {
    const response = await api.get<ApiResponse<{ name: string; slug: string }[]>>('/complaints/public/tenants', { params: { q } });
    return response.data;
  },
  getPublicDepartments: async (slug: string) => {
    const response = await api.get<ApiResponse<{ id: string; name: string }[]>>(`/complaints/public/tenant/${slug}/departments`);
    return response.data;
  },
  submitFeedback: async (id: string, data: { rating: number; comment?: string }) => {
    const response = await api.post<ApiResponse<null>>(`/complaints/${id}/feedback`, data);
    return response.data;
  },
  exportComplaints: async (params?: Record<string, string | undefined>) => {
    const response = await api.get('/complaints/export', { params, responseType: 'blob' });
    const disposition = (response.headers['content-disposition'] as string) ?? '';
    const match = disposition.match(/filename="?([^";\r\n]+)"?/);
    triggerDownload(response.data as Blob, match?.[1] ?? `complaints-${new Date().toISOString().slice(0, 10)}.csv`);
  },
};

// ─── Users API ────────────────────────────────────────────────────────────────
export const usersApi = {
  list: async (params?: Record<string, string | number | undefined>) => {
    const response = await api.get<ApiResponse<PaginatedResponse<User>>>('/users', { params });
    return response.data;
  },
  create: async (data: { name: string; email: string; password: string; roleType?: string; departmentId?: string | null; tenantId?: string | null }) => {
    const response = await api.post<ApiResponse<User>>('/users', data);
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
  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await api.patch<ApiResponse<null>>('/users/me/password', { currentPassword, newPassword });
    return response.data;
  },
  assignRole: async (id: string, roleType: string, departmentId?: string | null) => {
    const response = await api.patch<ApiResponse<User>>(`/users/${id}/role`, { roleType, departmentId: departmentId ?? null });
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
  create: async (data: { name: string; slug?: string; slaHours?: number; serviceAreas?: string[]; categoryTags?: string[]; routingKeywords?: string[]; tenantId?: string }) => {
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
  // Assign a user to this department (or unassign with null) without changing their role
  assignUser: async (userId: string, departmentId: string | null) => {
    const response = await api.patch<ApiResponse<User>>(`/users/${userId}/department`, { departmentId });
    return response.data;
  },
};

// ─── Workflow Automation API ────────────────────────────────────────────────
export const workflowApi = {
  getSettings: async (tenantId?: string) => {
    const response = await api.get<ApiResponse<WorkflowSettings>>('/workflow/settings', {
      params: tenantId ? { tenantId } : undefined,
    });
    return response.data;
  },

  updateSettings: async (data: {
    smartRoutingEnabled?: boolean;
    autoCloseEnabled?: boolean;
    autoCloseAfterDays?: number;
    tenantId?: string;
  }) => {
    const response = await api.patch<ApiResponse<WorkflowSettings>>('/workflow/settings', data);
    return response.data;
  },

  listAssignmentRules: async (params?: Record<string, string | number | boolean | undefined>) => {
    const response = await api.get<ApiResponse<PaginatedResponse<WorkflowAssignmentRule>>>('/workflow/assignment-rules', {
      params,
    });
    return response.data;
  },

  createAssignmentRule: async (data: {
    name: string;
    description?: string | null;
    isActive?: boolean;
    priority?: number;
    stopOnMatch?: boolean;
    categoryPatterns?: string[];
    areaPatterns?: string[];
    keywordPatterns?: string[];
    departmentId?: string | null;
    assignToId?: string | null;
    setPriority?: Priority | null;
    tenantId?: string;
  }) => {
    const response = await api.post<ApiResponse<WorkflowAssignmentRule>>('/workflow/assignment-rules', data);
    return response.data;
  },

  updateAssignmentRule: async (id: string, data: {
    name?: string;
    description?: string | null;
    isActive?: boolean;
    priority?: number;
    stopOnMatch?: boolean;
    categoryPatterns?: string[];
    areaPatterns?: string[];
    keywordPatterns?: string[];
    departmentId?: string | null;
    assignToId?: string | null;
    setPriority?: Priority | null;
    tenantId?: string;
  }) => {
    const response = await api.patch<ApiResponse<WorkflowAssignmentRule>>(`/workflow/assignment-rules/${id}`, data);
    return response.data;
  },

  deleteAssignmentRule: async (id: string, tenantId?: string) => {
    const response = await api.delete<ApiResponse<null>>(`/workflow/assignment-rules/${id}`, {
      params: tenantId ? { tenantId } : undefined,
    });
    return response.data;
  },

  listCategorySla: async (params?: Record<string, string | number | boolean | undefined>) => {
    const response = await api.get<ApiResponse<CategorySlaPolicy[]>>('/workflow/category-sla', { params });
    return response.data;
  },

  upsertCategorySla: async (data: {
    categoryLabel: string;
    categoryKey?: string;
    slaHours: number;
    isActive?: boolean;
    tenantId?: string;
  }) => {
    const response = await api.post<ApiResponse<CategorySlaPolicy>>('/workflow/category-sla', data);
    return response.data;
  },

  deleteCategorySla: async (id: string, tenantId?: string) => {
    const response = await api.delete<ApiResponse<null>>(`/workflow/category-sla/${id}`, {
      params: tenantId ? { tenantId } : undefined,
    });
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
  exportAnalytics: async (report: string = 'overview') => {
    const response = await api.get('/analytics/export', { params: { report }, responseType: 'blob' });
    const disposition = (response.headers['content-disposition'] as string) ?? '';
    const match = disposition.match(/filename="?([^";\r\n]+)"?/);
    triggerDownload(response.data as Blob, match?.[1] ?? `analytics-${report}-${new Date().toISOString().slice(0, 10)}.csv`);
  },

  getMapStats: async (windowDays: 1 | 7 | 30 | "all" = 7): Promise<ApiResponse<{
    states: {
      id: string;
      complaints: number;
      resolved: number;
      pending: number;
      critical: number;
      assignedOpen: number;
      unassignedOpen: number;
      capacityStressPct: number;
      avgResolutionHours: number | null;
      slaBreachPct: number;
      changePct: number;
      anomalyScore: number;
      badges: string[];
      cities: { name: string; complaints: number }[];
      topCategories: { name: string; count: number }[];
      recentComplaints: {
        trackingId: string;
        createdAt: string;
        priority: string;
        status: string;
        category: string;
        locality?: string;
        excerpt: string;
      }[];
    }[];
    unlocatedCount: number;
    dataQuality: {
      windowDays: number;
      mappedCount: number;
      unmappedPct: number;
      ambiguousLocalities: { locality: string; count: number }[];
    };
    comparison: {
      windowDays: number;
      currentWindowStart: string;
      previousWindowStart: string;
      currentTotal: number;
      previousTotal: number;
      deltaPct: number;
    };
    timeline: { date: string; total: number; critical: number }[];
    anomalyStates: { id: string; anomalyScore: number; changePct: number; complaints: number }[];
    routePlan: { city: string; complaints: number; sequence: number }[];
  }>> => {
    const response = await api.get('/analytics/map-stats', { params: { windowDays } });
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
    const response = await api.get<ApiResponse<{ unreadCount: number }>>('/notifications/unread-count');
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
