import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { slugify, getPagination, paginatedResponse } from "../utils/helpers.js";

export const listTenants = async (query = {}) => {
  const { page, limit, skip } = getPagination(query);

  const where = {};
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
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            users:       true,
            departments: true,
            complaints:  true,
          },
        },
      },
    }),
    prisma.tenant.count({ where }),
  ]);

  return paginatedResponse(tenants, total, page, limit);
};

export const getTenantById = async (id) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    select: {
      id:        true,
      name:      true,
      slug:      true,
      isActive:  true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          users:       true,
          departments: true,
          complaints:  true,
        },
      },
    },
  });

  if (!tenant) throw new ApiError(404, "Tenant not found");
  return tenant;
};

export const createTenant = async ({ name, slug: providedSlug }) => {
  const slug = providedSlug ? slugify(providedSlug) : slugify(name);

  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) throw new ApiError(409, `Slug "${slug}" is already taken`);

  return prisma.tenant.create({
    data: { name: name.trim(), slug },
    select: {
      id:        true,
      name:      true,
      slug:      true,
      isActive:  true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

export const updateTenant = async (id, { name, isActive }) => {
  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) throw new ApiError(404, "Tenant not found");

  const data = {};
  if (name !== undefined) data.name = name.trim();
  if (isActive !== undefined) data.isActive = isActive;

  return prisma.tenant.update({
    where: { id },
    data,
    select: {
      id:        true,
      name:      true,
      slug:      true,
      isActive:  true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

export const deactivateTenant = async (id) => {
  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) throw new ApiError(404, "Tenant not found");
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
