import bcrypt from "bcrypt";
import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { forTenant } from "../utils/tenantScope.js";
import { getPagination, paginatedResponse } from "../utils/helpers.js";
import { canAssignRole, canManageUser } from "../utils/roleHierarchy.js";
import { validatePassword } from "../utils/validators.js";
import { env } from "../config/env.js";

const userSelect = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  department: { select: { id: true, name: true, slug: true } },
  role: { select: { id: true, type: true } },
  tenant: { select: { id: true, name: true, slug: true } },
};

const resolveRoleId = async (roleType) => {
  const role = await prisma.role.findUnique({ where: { type: roleType } });
  if (!role) throw new ApiError(400, `Role "${roleType}" does not exist`);
  return role.id;
};

export const getMe = async (user) => {
  const me = await prisma.user.findFirst({
    where: { id: user.userId, isDeleted: false, ...forTenant(user) },
    select: userSelect,
  });
  if (!me) throw new ApiError(404, "User not found");
  return me;
};

export const listUsers = async (query, user) => {
  const { role } = user;

  if (role === "CALL_OPERATOR" || role === "OFFICER") {
    throw new ApiError(403, "You do not have permission to list users");
  }

  const { page, limit, skip } = getPagination(query);
  const { search, roleType, isActive, departmentId, tenantId: tenantIdParam } = query;

  let deptFilter = {};

  if (role === "DEPARTMENT_HEAD") {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { departmentId: true },
    });
    if (!dbUser?.departmentId) {
      throw new ApiError(403, "Department head is not assigned to any department");
    }
    deptFilter = { departmentId: dbUser.departmentId };
  } else if (departmentId) {
    deptFilter = { departmentId };
  }

  // SUPER_ADMIN can pass an explicit tenantId to scope results to one tenant.
  // ADMIN is always scoped to their own tenant via forTenant() regardless of params.
  const tenantFilter =
    role === "SUPER_ADMIN" && tenantIdParam
      ? { tenantId: tenantIdParam }
      : forTenant(user);

  const where = {
    isDeleted: false,
    ...tenantFilter,
    ...deptFilter,
    ...(isActive !== undefined && { isActive: isActive === "true" }),
    ...(roleType && { role: { type: roleType } }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: userSelect,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return paginatedResponse(users, total, page, limit);
};

export const getUserById = async (targetId, user) => {
  const { role } = user;

  const target = await prisma.user.findFirst({
    where: { id: targetId, isDeleted: false, ...forTenant(user) },
    select: { ...userSelect, departmentId: true },
  });

  if (!target) throw new ApiError(404, "User not found");

  if (role === "DEPARTMENT_HEAD") {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { departmentId: true },
    });
    if (!dbUser?.departmentId || target.departmentId !== dbUser.departmentId) {
      throw new ApiError(404, "User not found");
    }
  }

  const { departmentId: _d, ...safeTarget } = target;
  return safeTarget;
};

export const updateMyProfile = async (userId, data, user) => {
  if (userId !== user.userId) {
    throw new ApiError(403, "You can only update your own profile");
  }

  const existing = await prisma.user.findFirst({
    where: { id: userId, isDeleted: false, ...forTenant(user) },
  });
  if (!existing) throw new ApiError(404, "User not found");

  const { name } = data;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { ...(name !== undefined && { name }) },
    select: userSelect,
  });

  return updated;
};

export const assignRole = async (targetId, { roleType, departmentId }, user) => {
  if (!canAssignRole(user.role, roleType)) {
    throw new ApiError(403, `You cannot assign the ${roleType} role`);
  }

  const target = await prisma.user.findFirst({
    where: { id: targetId, isDeleted: false, ...forTenant(user) },
    select: { id: true, role: { select: { type: true } }, departmentId: true },
  });

  if (!target) throw new ApiError(404, "User not found");

  if (!canManageUser(user.role, target.role.type)) {
    throw new ApiError(403, "You cannot modify a user with an equal or higher role");
  }

  // Validate departmentId belongs to tenant if provided
  if (departmentId !== undefined && departmentId !== null) {
    const dept = await prisma.department.findFirst({
      where: { id: departmentId, isDeleted: false, isActive: true, ...forTenant(user) },
    });
    if (!dept) throw new ApiError(404, "Department not found");
  }

  const roleId = await resolveRoleId(roleType);

  // Determine which department to scope the head-demotion check against
  const effectiveDeptId = departmentId !== undefined ? departmentId : target.departmentId;

  // If promoting to DEPARTMENT_HEAD, auto-demote any existing head in that department
  // to OFFICER so there is never more than one head per department.
  if (roleType === "DEPARTMENT_HEAD" && effectiveDeptId) {
    const officerRoleId = await resolveRoleId("OFFICER");
    await prisma.user.updateMany({
      where: {
        departmentId: effectiveDeptId,
        roleId: roleId,          // currently has DEPARTMENT_HEAD role
        id: { not: targetId },   // exclude the user being promoted
        isDeleted: false,
        ...forTenant(user),
      },
      data: { roleId: officerRoleId },
    });
  }

  const updated = await prisma.user.update({
    where: { id: targetId },
    data: {
      roleId,
      ...(departmentId !== undefined && { departmentId }),
    },
    select: userSelect,
  });

  return updated;
};

export const assignDepartment = async (targetId, { departmentId }, user) => {
  const target = await prisma.user.findFirst({
    where: { id: targetId, isDeleted: false, ...forTenant(user) },
    select: { id: true, role: { select: { type: true } } },
  });
  if (!target) throw new ApiError(404, "User not found");

  if (!canManageUser(user.role, target.role.type)) {
    throw new ApiError(403, "You cannot modify a user with an equal or higher role");
  }

  if (departmentId !== null && departmentId !== undefined) {
    const dept = await prisma.department.findFirst({
      where: { id: departmentId, isDeleted: false, isActive: true, ...forTenant(user) },
    });
    if (!dept) throw new ApiError(404, "Department not found");
  }

  const updated = await prisma.user.update({
    where: { id: targetId },
    data:  { departmentId: departmentId ?? null },
    select: userSelect,
  });

  return updated;
};

export const setUserActiveStatus = async (targetId, { isActive }, user) => {
  const target = await prisma.user.findFirst({
    where: { id: targetId, isDeleted: false, ...forTenant(user) },
    select: { id: true, role: { select: { type: true } } },
  });

  if (!target) throw new ApiError(404, "User not found");

  if (!canManageUser(user.role, target.role.type)) {
    throw new ApiError(403, "You cannot activate/deactivate a user with an equal or higher role");
  }

  if (targetId === user.userId) {
    throw new ApiError(400, "You cannot deactivate your own account");
  }

  const updated = await prisma.user.update({
    where: { id: targetId },
    data: { isActive: Boolean(isActive) },
    select: userSelect,
  });

  return updated;
};

export const softDeleteUser = async (targetId, user) => {
  const target = await prisma.user.findFirst({
    where: { id: targetId, isDeleted: false, ...forTenant(user) },
    select: { id: true, role: { select: { type: true } } },
  });

  if (!target) throw new ApiError(404, "User not found");

  if (!canManageUser(user.role, target.role.type)) {
    throw new ApiError(403, "You cannot delete a user with an equal or higher role");
  }

  if (targetId === user.userId) {
    throw new ApiError(400, "You cannot delete your own account");
  }

  await prisma.user.update({
    where: { id: targetId },
    data: { isDeleted: true, isActive: false },
  });
};

export const changePassword = async (userId, { currentPassword, newPassword }, user) => {
  if (userId !== user.userId) {
    throw new ApiError(403, "You can only change your own password");
  }

  const passwordErr = validatePassword(newPassword);
  if (passwordErr) throw new ApiError(400, passwordErr);

  const dbUser = await prisma.user.findFirst({
    where: { id: userId, isDeleted: false, ...forTenant(user) },
    select: { id: true, password: true },
  });
  if (!dbUser) throw new ApiError(404, "User not found");

  const matches = await bcrypt.compare(currentPassword, dbUser.password);
  if (!matches) throw new ApiError(400, "Current password is incorrect");

  const hashedPassword = await bcrypt.hash(newPassword, env.BCRYPT_SALT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data:  { password: hashedPassword },
  });

  return true;
};

export const createUser = async ({ name, email, password, roleType = "CALL_OPERATOR", departmentId, tenantId: targetTenantId }, user) => {
  // Only ADMIN+ can create users; enforce role hierarchy so no privilege escalation
  if (!canAssignRole(user.role, roleType)) {
    throw new ApiError(403, `You cannot create a user with role ${roleType}`);
  }

  const passwordErr = validatePassword(password);
  if (passwordErr) throw new ApiError(400, passwordErr);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ApiError(400, "Email already registered");

  // If departmentId provided, verify it belongs to the tenant
  if (departmentId) {
    const dept = await prisma.department.findFirst({
      where: { id: departmentId, isDeleted: false, isActive: true, ...forTenant(user) },
    });
    if (!dept) throw new ApiError(404, "Department not found");
  }

  const role = await prisma.role.findUnique({ where: { type: roleType } });
  if (!role) throw new ApiError(400, `Role "${roleType}" does not exist`);

  // Resolve tenantId — SUPER_ADMIN may specify a different tenant
  const caller = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { tenantId: true },
  });
  if (!caller?.tenantId) throw new ApiError(400, "Could not determine tenant");

  let finalTenantId = caller.tenantId;
  if (user.role === "SUPER_ADMIN" && targetTenantId) {
    const tenant = await prisma.tenant.findFirst({ where: { id: targetTenantId, isActive: true } });
    if (!tenant) throw new ApiError(404, "Tenant not found");
    finalTenantId = targetTenantId;
  }

  // Re-validate departmentId against the finalTenantId (may differ from caller's tenant)
  if (departmentId) {
    const dept = await prisma.department.findFirst({
      where: { id: departmentId, isDeleted: false, isActive: true, tenantId: finalTenantId },
    });
    if (!dept) throw new ApiError(404, "Department not found in target tenant");
  }

  const hashedPassword = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);

  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      tenantId: finalTenantId,
      roleId: role.id,
      ...(departmentId ? { departmentId } : {}),
      emailVerified: true, // admin-created accounts skip email verification
    },
    select: userSelect,
  });

  return newUser;
};
