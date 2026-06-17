-- CreateTable: ComplaintResolutionVerification
-- Purpose: Allow citizens to verify if a complaint marked RESOLVED is actually resolved
-- Flow: RESOLVED → Citizen confirms YES → CLOSED, or Citizen confirms NO → ASSIGNED

CREATE TABLE "ComplaintResolutionVerification" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "verificationToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isResolved" BOOLEAN,
    "citizenComment" TEXT,
    "respondedAt" TIMESTAMP(3),
    "reminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplaintResolutionVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ComplaintResolutionVerification_complaintId_key" ON "ComplaintResolutionVerification"("complaintId");

-- CreateIndex
CREATE UNIQUE INDEX "ComplaintResolutionVerification_verificationToken_key" ON "ComplaintResolutionVerification"("verificationToken");

-- CreateIndex
CREATE INDEX "ComplaintResolutionVerification_complaintId_idx" ON "ComplaintResolutionVerification"("complaintId");

-- CreateIndex
CREATE INDEX "ComplaintResolutionVerification_verificationToken_idx" ON "ComplaintResolutionVerification"("verificationToken");

-- CreateIndex
CREATE INDEX "ComplaintResolutionVerification_expiresAt_idx" ON "ComplaintResolutionVerification"("expiresAt");

-- AddForeignKey
ALTER TABLE "ComplaintResolutionVerification" ADD CONSTRAINT "ComplaintResolutionVerification_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
