import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { slugify, getPagination, paginatedResponse } from "../utils/helpers.js";

const resolveSuperAdminScope = async (user) => {
  const actor = await prisma.user.findUnique({
    where: { id: user.userId },
    select: {
      id: true,
      isActive: true,
      isDeleted: true,
      isPlatformOwner: true,
      managedStateCode: true,
      role: { select: { type: true } },
    },
  });

  if (!actor || actor.isDeleted || !actor.isActive) {
    throw new ApiError(403, "Actor account is inactive");
  }
  if (actor.role?.type !== "SUPER_ADMIN") {
    throw new ApiError(403, "Only SUPER_ADMIN can access tenants");
  }

  return actor;
};

const ensureTenantInScope = (tenant, actor) => {
  if (!tenant) throw new ApiError(404, "Tenant not found");
  if (actor.isPlatformOwner) return;
  if (!actor.managedStateCode) {
    throw new ApiError(403, "State super admin does not have an assigned state");
  }
  if (tenant.stateCode !== actor.managedStateCode) {
    throw new ApiError(404, "Tenant not found");
  }
};

export const listTenants = async (query = {}, user) => {
  const actor = await resolveSuperAdminScope(user);
  const { page, limit, skip } = getPagination(query);

  const where = {};
  if (!actor.isPlatformOwner) {
    if (!actor.managedStateCode) {
      throw new ApiError(403, "State super admin does not have an assigned state");
    }
    where.stateCode = actor.managedStateCode;
  }
  if (query.isActive !== undefined) {
    where.isActive = query.isActive === "true" || query.isActive === true;
  }
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { slug: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const [tenants, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id:        true,
        name:      true,
        slug:      true,
        isActive:  true,
        areas:     true,
        stateCode: true,
        stateLabel: true,
        districtLabel: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            users:       { where: { isDeleted: false } },
            departments: { where: { isDeleted: false } },
            complaints:  { where: { isDeleted: false } },
          },
        },
      },
    }),
    prisma.tenant.count({ where }),
  ]);

  return paginatedResponse(tenants, total, page, limit);
};

export const getTenantById = async (id, user) => {
  const actor = await resolveSuperAdminScope(user);
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    select: {
      id:        true,
      name:      true,
      slug:      true,
      isActive:  true,
      areas:     true,
      stateCode: true,
      stateLabel: true,
      districtLabel: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          users:       { where: { isDeleted: false } },
          departments: { where: { isDeleted: false } },
          complaints:  { where: { isDeleted: false } },
        },
      },
    },
  });

  ensureTenantInScope(tenant, actor);
  return tenant;
};

export const createTenant = async ({ name, slug: providedSlug, areas, stateCode, stateLabel, districtLabel }, user) => {
  const actor = await resolveSuperAdminScope(user);
  if (!actor.isPlatformOwner && actor.managedStateCode !== stateCode) {
    throw new ApiError(403, "You can only create tenants in your assigned state");
  }

  const slug = providedSlug ? slugify(providedSlug) : slugify(name);

  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) throw new ApiError(409, `Slug "${slug}" is already taken`);

  return prisma.tenant.create({
    data: {
      name: name.trim(),
      slug,
      areas,
      stateCode,
      stateLabel: stateLabel.trim(),
      districtLabel: districtLabel.trim(),
    },
    select: {
      id:        true,
      name:      true,
      slug:      true,
      isActive:  true,
      areas:     true,
      stateCode: true,
      stateLabel: true,
      districtLabel: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

export const updateTenant = async (id, { name, isActive, areas, stateCode, stateLabel, districtLabel }, user) => {
  const actor = await resolveSuperAdminScope(user);
  const tenant = await prisma.tenant.findUnique({ where: { id } });
  ensureTenantInScope(tenant, actor);

  if (!actor.isPlatformOwner && stateCode && stateCode !== tenant.stateCode) {
    throw new ApiError(403, "Only platform owner can change tenant state");
  }

  const data = {};
  if (name !== undefined) data.name = name.trim();
  if (isActive !== undefined) data.isActive = isActive;
  if (areas !== undefined) data.areas = areas;
  if (stateCode !== undefined) data.stateCode = stateCode;
  if (stateLabel !== undefined) data.stateLabel = stateLabel.trim();
  if (districtLabel !== undefined) data.districtLabel = districtLabel.trim();

  return prisma.tenant.update({
    where: { id },
    data,
    select: {
      id:        true,
      name:      true,
      slug:      true,
      isActive:  true,
      areas:     true,
      stateCode: true,
      stateLabel: true,
      districtLabel: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

export const deactivateTenant = async (id, user) => {
  const actor = await resolveSuperAdminScope(user);
  const tenant = await prisma.tenant.findUnique({ where: { id } });
  ensureTenantInScope(tenant, actor);
  if (!tenant.isActive) throw new ApiError(409, "Tenant is already inactive");

  return prisma.tenant.update({
    where: { id },
    data:  { isActive: false },
    select: {
      id:        true,
      name:      true,
      slug:      true,
      isActive:  true,
      updatedAt: true,
    },
  });
};
