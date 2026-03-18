import { ApiError } from "./ApiError.js";

const requireTenantId = (user) => {
  if (!user?.tenantId) {
    throw new ApiError(500, `tenantId missing on authenticated user: role=${user?.role}, userId=${user?.userId}`);
  }
  return user.tenantId;
};

export const forTenant = (user) => {
  // SUPER_ADMIN is platform-level and has no tenantId — let them see all tenants
  if (user?.role === "SUPER_ADMIN") return {};
  return { tenantId: requireTenantId(user) };
};

export const inTenant = (user) => ({
  tenantId: requireTenantId(user),
});

export const assertTenant = (resource, user, label = "Resource") => {
  if (!resource) {
    throw new ApiError(404, `${label} not found`);
  }
  if (resource.tenantId !== user.tenantId) {
    throw new ApiError(404, `${label} not found`);
  }
};

export const isAssignedOfficer = (complaint, user) =>
  complaint.assignedToId === user.userId;

export const isInDepartment = (complaint, userRecord) =>
  complaint.departmentId != null &&
  complaint.departmentId === userRecord.departmentId;

export const isCreator = (complaint, user) =>
  complaint.createdById === user.userId;
