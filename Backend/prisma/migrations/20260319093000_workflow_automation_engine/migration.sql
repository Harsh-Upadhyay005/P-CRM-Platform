-- AlterTable
ALTER TABLE "Department"
ADD COLUMN "categoryTags" TEXT [] DEFAULT ARRAY[]::TEXT [],
ADD COLUMN "routingKeywords" TEXT [] DEFAULT ARRAY[]::TEXT [];

-- CreateTable
CREATE TABLE "WorkflowSetting" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "smartRoutingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autoCloseEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autoCloseAfterDays" INTEGER NOT NULL DEFAULT 7,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkflowSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationAssignmentRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "stopOnMatch" BOOLEAN NOT NULL DEFAULT true,
    "categoryPatterns" TEXT [] DEFAULT ARRAY[]::TEXT [],
    "areaPatterns" TEXT [] DEFAULT ARRAY[]::TEXT [],
    "keywordPatterns" TEXT [] DEFAULT ARRAY[]::TEXT [],
    "departmentId" TEXT,
    "assignToId" TEXT,
    "setPriority" "Priority",
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AutomationAssignmentRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategorySlaPolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "categoryKey" TEXT NOT NULL,
    "categoryLabel" TEXT NOT NULL,
    "slaHours" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CategorySlaPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowSetting_tenantId_key" ON "WorkflowSetting" ("tenantId");

-- CreateIndex
CREATE INDEX "WorkflowSetting_tenantId_idx" ON "WorkflowSetting" ("tenantId");

-- CreateIndex
CREATE INDEX "AutomationAssignmentRule_tenantId_idx" ON "AutomationAssignmentRule" ("tenantId");

-- CreateIndex
CREATE INDEX "AutomationAssignmentRule_tenantId_isActive_priority_idx" ON "AutomationAssignmentRule" (
    "tenantId",
    "isActive",
    "priority"
);

-- CreateIndex
CREATE INDEX "AutomationAssignmentRule_departmentId_idx" ON "AutomationAssignmentRule" ("departmentId");

-- CreateIndex
CREATE INDEX "AutomationAssignmentRule_assignToId_idx" ON "AutomationAssignmentRule" ("assignToId");

-- CreateIndex
CREATE UNIQUE INDEX "CategorySlaPolicy_tenantId_categoryKey_key" ON "CategorySlaPolicy" ("tenantId", "categoryKey");

-- CreateIndex
CREATE INDEX "CategorySlaPolicy_tenantId_idx" ON "CategorySlaPolicy" ("tenantId");

-- CreateIndex
CREATE INDEX "CategorySlaPolicy_tenantId_isActive_idx" ON "CategorySlaPolicy" ("tenantId", "isActive");

-- AddForeignKey
ALTER TABLE "WorkflowSetting"
ADD CONSTRAINT "WorkflowSetting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationAssignmentRule"
ADD CONSTRAINT "AutomationAssignmentRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationAssignmentRule"
ADD CONSTRAINT "AutomationAssignmentRule_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationAssignmentRule"
ADD CONSTRAINT "AutomationAssignmentRule_assignToId_fkey" FOREIGN KEY ("assignToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationAssignmentRule"
ADD CONSTRAINT "AutomationAssignmentRule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategorySlaPolicy"
ADD CONSTRAINT "CategorySlaPolicy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;