import { ApiError } from "./ApiError.js";

const requireTenantId = (user) => {
  if (!user?.tenantId) {
    throw new ApiError(500, `tenantId missing on authenticated user: role=${user?.role}, userId=${user?.userId}`);
  }
  return user.tenantId;
};

export const forTenant = (user) => {
  // SUPER_ADMIN can be either platform owner (all states) or state-scoped.
  if (user?.role === "SUPER_ADMIN") {
    if (user?.isPlatformOwner) return {};
    if (user?.managedStateCode) {
      return {
        tenant: {
          is: { stateCode: user.managedStateCode },
        },
      };
    }
    throw new ApiError(403, "State super admin does not have an assigned state");
  }
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
