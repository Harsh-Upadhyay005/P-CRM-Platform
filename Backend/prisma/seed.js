import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import { env } from "../src/config/env.js";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEFAULT_TENANTS = [
  {
    name: "P-CRM Main Office",
    slug: "main-office",
    superAdmin: {
      name: "Super Admin",
      email: "admin@mainoffice.com",
      password: "Admin@123",
    },
  },
];

async function createRoles() {
  const roles = [
    "SUPER_ADMIN",
    "ADMIN",
    "DEPARTMENT_HEAD",
    "OFFICER",
    "CALL_OPERATOR",
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { type: role },
      update: {},
      create: { type: role },
    });
  }

  console.log("Roles seeded");
}

async function createTenantWithAdmin(tenantConfig) {
  const existingTenant = await prisma.tenant.findUnique({
    where: { slug: tenantConfig.slug },
  });

  if (existingTenant) {
    console.log(`Tenant '${tenantConfig.slug}' already exists`);
    return;
  }

  const tenant = await prisma.tenant.create({
    data: {
      name: tenantConfig.name,
      slug: tenantConfig.slug,
    },
  });

  const superAdminRole = await prisma.role.findUnique({
    where: { type: "SUPER_ADMIN" },
  });

  const hashedPassword = await bcrypt.hash(
    tenantConfig.superAdmin.password,
    10,
  );

  await prisma.user.create({
    data: {
      name: tenantConfig.superAdmin.name,
      email: tenantConfig.superAdmin.email,
      password: hashedPassword,
      tenantId: tenant.id,
      roleId: superAdminRole.id,
    },
  });

  console.log(`Tenant '${tenant.slug}' seeded with Super Admin`);
}

async function main() {
  console.log("Starting multi-tenant seed...");

  await createRoles();

  for (const tenant of DEFAULT_TENANTS) {
    await createTenantWithAdmin(tenant);
  }

  console.log("Seeding completed successfully");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
