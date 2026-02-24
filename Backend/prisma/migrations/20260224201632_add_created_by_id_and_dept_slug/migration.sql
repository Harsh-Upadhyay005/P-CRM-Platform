/*
  Warnings:

  - A unique constraint covering the columns `[tenantId,slug]` on the table `Department` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `Department` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Complaint" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "slug" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Complaint_createdById_idx" ON "Complaint"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "Department_tenantId_slug_key" ON "Department"("tenantId", "slug");

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
