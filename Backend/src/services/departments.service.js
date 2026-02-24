import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { forTenant, inTenant } from "../utils/tenantScope.js";
import { getPagination, paginatedResponse, slugify } from "../utils/helpers.js";

const deptSelect = {
  id: true,
  name: true,
  slug: true,
  slaHours: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { users: { where: { isDeleted: false, isActive: true } }, complaints: { where: { isDeleted: false } } } },
};

const assertDeptAccess = async (deptId, user, action = "modify") => {
  if (user.role === "DEPARTMENT_HEAD") {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { departmentId: true },
    });
    if (!dbUser?.departmentId || dbUser.departmentId !== deptId) {
      throw new ApiError(403, `Department heads can only ${action} their own department`);
    }
  }
};

export const createDepartment = async (data, user) => {
  const { name, slaHours } = data;
  const slug = slugify(name);

  const existing = await prisma.department.findFirst({
    where: { slug, isDeleted: false, ...forTenant(user) },
  });
  if (existing) throw new ApiError(409, "A department with this name already exists");

  const dept = await prisma.department.create({
    data: {
      name,
      slug,
      slaHours: slaHours ?? 48,
      ...inTenant(user),
    },
    select: deptSelect,
  });

  return dept;
};

export const listDepartments = async (query, user) => {
  const { page, limit, skip } = getPagination(query);
  const { search, isActive } = query;

  const where = {
    isDeleted: false,
    ...forTenant(user),
    ...(isActive !== undefined && { isActive: isActive === "true" }),
    ...(search && {
      name: { contains: search, mode: "insensitive" },
    }),
  };

  const [departments, total] = await prisma.$transaction([
    prisma.department.findMany({
      where,
      select: deptSelect,
      orderBy: { name: "asc" },
      skip,
      take: limit,
    }),
    prisma.department.count({ where }),
  ]);

  return paginatedResponse(departments, total, page, limit);
};

export const getDepartment = async (id, user) => {
  const dept = await prisma.department.findFirst({
    where: { id, isDeleted: false, ...forTenant(user) },
    select: deptSelect,
  });
  if (!dept) throw new ApiError(404, "Department not found");
  return dept;
};

export const updateDepartment = async (id, data, user) => {
  const dept = await prisma.department.findFirst({
    where: { id, isDeleted: false, ...forTenant(user) },
    select: { id: true },
  });
  if (!dept) throw new ApiError(404, "Department not found");

  await assertDeptAccess(id, user, "modify");

  const { name, slaHours, isActive } = data;
  let slug;

  if (name !== undefined) {
    slug = slugify(name);
    const duplicate = await prisma.department.findFirst({
      where: { slug, isDeleted: false, ...forTenant(user), NOT: { id } },
    });
    if (duplicate) throw new ApiError(409, "A department with this name already exists");
  }

  const updated = await prisma.department.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(slug !== undefined && { slug }),
      ...(slaHours !== undefined && { slaHours }),
      ...(isActive !== undefined && { isActive }),
    },
    select: deptSelect,
  });

  return updated;
};

export const softDeleteDepartment = async (id, user) => {
  const dept = await prisma.department.findFirst({
    where: { id, isDeleted: false, ...forTenant(user) },
    select: { id: true },
  });
  if (!dept) throw new ApiError(404, "Department not found");

  const assignedUsers = await prisma.user.count({
    where: { departmentId: id, isDeleted: false, isActive: true },
  });
  if (assignedUsers > 0) {
    throw new ApiError(409, `Cannot delete department with ${assignedUsers} active user(s). Reassign them first.`);
  }

  await prisma.department.update({
    where: { id },
    data: { isDeleted: true, isActive: false },
  });
};
