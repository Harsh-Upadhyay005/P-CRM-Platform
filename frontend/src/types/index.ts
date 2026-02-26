export type RoleType =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "DEPARTMENT_HEAD"
  | "OFFICER"
  | "CALL_OPERATOR";

export type ComplaintStatus =
  | "OPEN"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "ESCALATED"
  | "RESOLVED"
  | "CLOSED";

export type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type SlaState = "OK" | "WARNING" | "BREACHED";

export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  role: { id: string; type: RoleType };
  department: { id: string; name: string; slug: string } | null;
}

export interface Complaint {
  id: string;
  trackingId: string;
  citizenName: string;
  citizenPhone: string;
  citizenEmail: string | null;
  category: string | null;
  priority: Priority;
  status: ComplaintStatus;
  description: string;
  aiScore: number | null;
  sentimentScore: number | null;
  duplicateScore: number | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  department: { id: string; name: string } | null;
  assignedTo: { id: string; name: string } | null;
  createdBy: { id: string; name: string } | null;
  statusHistory: StatusHistoryEntry[];
}

export interface StatusHistoryEntry {
  id: string;
  oldStatus: ComplaintStatus | null;
  newStatus: ComplaintStatus;
  changedAt: string;
  changedBy: { id: string; name: string } | null;
}

export interface Department {
  id: string;
  name: string;
  slug: string;
  slaHours: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { users: number; complaints: number };
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  complaintId: string | null;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { users: number; departments: number; complaints: number };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface Note {
  id: string;
  note: string;
  createdAt: string;
  createdBy: { id: string; name: string } | null;
}

export interface Attachment {
  id: string;
  fileName: string;
  fileSize: number; // bytes
  mimeType: string;
  url: string; // 1-hour signed URL
  createdAt: string;
  uploadedBy: { id: string; name: string } | null;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}
