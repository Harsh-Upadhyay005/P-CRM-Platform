import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import { env } from "../src/config/env.js";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const superAdminEmail = env.SEED_SUPER_ADMIN_EMAIL || "admin@example.com";
const superAdminPassword = env.SEED_SUPER_ADMIN_PASSWORD || "Admin@123";

if (!env.SEED_SUPER_ADMIN_EMAIL || !env.SEED_SUPER_ADMIN_PASSWORD) {
  console.warn(
    "WARNING: SEED_SUPER_ADMIN_EMAIL/PASSWORD not set. Using defaults: admin@example.com / Admin@123"
  );
}

const DEFAULT_TENANTS = [
  {
    name: "P-CRM Main Office",
    slug: "main-office",
    superAdmin: {
      name: "Super Admin",
      email: superAdminEmail,
      password: superAdminPassword,
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
  const superAdminRole = await prisma.role.findUnique({
    where: { type: "SUPER_ADMIN" },
  });

  const hashedPassword = await bcrypt.hash(
    tenantConfig.superAdmin.password,
    10,
  );

  let tenant = await prisma.tenant.findUnique({
    where: { slug: tenantConfig.slug },
  });

  if (tenant) {
    // Tenant exists — upsert the super admin so credentials stay in sync with .env
    await prisma.user.upsert({
      where: { email: tenantConfig.superAdmin.email },
      update: {
        password: hashedPassword,
        emailVerified: true,
      },
      create: {
        name: tenantConfig.superAdmin.name,
        email: tenantConfig.superAdmin.email,
        password: hashedPassword,
        emailVerified: true,
        tenantId: tenant.id,
        roleId: superAdminRole.id,
      },
    });
    console.log(
      `Tenant '${tenantConfig.slug}' already exists — super admin upserted`
    );
    return;
  }

  tenant = await prisma.tenant.create({
    data: {
      name: tenantConfig.name,
      slug: tenantConfig.slug,
    },
  });

  await prisma.user.create({
    data: {
      name: tenantConfig.superAdmin.name,
      email: tenantConfig.superAdmin.email,
      password: hashedPassword,
      emailVerified: true,
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
