import axios, { AxiosError } from 'axios';
import { User, Complaint, PaginatedResponse } from '@/types';

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
    // Exclude login, refresh, and getMe endpoints to prevent infinite loops
    if (
      error.response?.status === 401 && 
      originalRequest && 
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/users/me') &&
      !('_retry' in originalRequest)
    ) {
      (originalRequest as { _retry?: boolean })._retry = true;
      
      try {
        await api.post('/auth/refresh');
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed — only redirect to login if not already on an auth page
        if (typeof window !== 'undefined') {
          const { pathname } = window.location;
          const isAuthPage =
            pathname.startsWith('/login') ||
            pathname.startsWith('/register') ||
            pathname.startsWith('/signup') ||
            pathname.startsWith('/forgot-password') ||
            pathname.startsWith('/verify-email') ||
            pathname.startsWith('/resend-verification');
          if (!isAuthPage) {
            window.location.href = '/login';
          }
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

export const complaintsApi = {
  list: async (params?: Record<string, string | number>) => {
    const response = await api.get<ApiResponse<PaginatedResponse<Complaint>>>('/complaints', { params });
    return response.data;
  },
  getStats: async (params?: Record<string, string | number>) => {
    const response = await api.get<ApiResponse<PaginatedResponse<Complaint>>>('/complaints', { params });
    return response.data;
  },
  create: async (data: Record<string, unknown>) => {
    const response = await api.post<ApiResponse<Complaint>>('/complaints', data);
    return response.data;
  },
};

export const analyticsApi = {
  getOverview: async (start?: string, end?: string) => {
    const params: Record<string, string> = {};
    if (start) params.startDate = start;
    if (end) params.endDate = end;
    const response = await api.get<ApiResponse<Record<string, unknown>>>('/analytics/overview', { params });
    return response.data;
  },
  getTrends: async (days: number = 7) => {
    const response = await api.get<ApiResponse<Record<string, unknown>>>('/analytics/trends', { params: { days } });
    return response.data;
  }
};

// Helper to extract error message
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
