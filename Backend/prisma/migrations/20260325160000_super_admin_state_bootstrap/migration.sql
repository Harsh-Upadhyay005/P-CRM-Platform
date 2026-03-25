-- Tenant geography metadata for strict state-scoped administration
ALTER TABLE "Tenant"
ADD COLUMN "stateCode" TEXT,
ADD COLUMN "stateLabel" TEXT,
ADD COLUMN "districtLabel" TEXT;

CREATE INDEX "Tenant_stateCode_idx" ON "Tenant" ("stateCode");

-- SUPER_ADMIN scope metadata
ALTER TABLE "User"
ADD COLUMN "managedStateCode" TEXT,
ADD COLUMN "isPlatformOwner" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "User" ALTER COLUMN "tenantId" DROP NOT NULL;

CREATE INDEX "User_managedStateCode_idx" ON "User" ("managedStateCode");

CREATE INDEX "User_isPlatformOwner_idx" ON "User" ("isPlatformOwner");

-- One-time state-code bootstrap tokens for direct SUPER_ADMIN signup
CREATE TABLE "SuperAdminSignupCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "consumedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SuperAdminSignupCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SuperAdminSignupCode_code_key" ON "SuperAdminSignupCode" ("code");

CREATE INDEX "SuperAdminSignupCode_stateCode_idx" ON "SuperAdminSignupCode" ("stateCode");

CREATE INDEX "SuperAdminSignupCode_expiresAt_idx" ON "SuperAdminSignupCode" ("expiresAt");

CREATE INDEX "SuperAdminSignupCode_isActive_idx" ON "SuperAdminSignupCode" ("isActive");

CREATE INDEX "SuperAdminSignupCode_createdById_idx" ON "SuperAdminSignupCode" ("createdById");

CREATE INDEX "SuperAdminSignupCode_consumedById_idx" ON "SuperAdminSignupCode" ("consumedById");

ALTER TABLE "SuperAdminSignupCode"
ADD CONSTRAINT "SuperAdminSignupCode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SuperAdminSignupCode"
ADD CONSTRAINT "SuperAdminSignupCode_consumedById_fkey" FOREIGN KEY ("consumedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE;