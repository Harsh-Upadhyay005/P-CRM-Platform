-- CreateTable
CREATE TABLE "SevaQuery" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "userId" TEXT,
    "conversationData" JSONB NOT NULL,
    "classificationAttempts" INTEGER NOT NULL DEFAULT 0,
    "finalCategory" TEXT NOT NULL,
    "finalConfidence" DOUBLE PRECISION NOT NULL,
    "createdComplaintId" TEXT,
    "sessionLanguage" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SevaQuery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SevaQuery_createdComplaintId_key" ON "SevaQuery"("createdComplaintId");

-- CreateIndex
CREATE INDEX "SevaQuery_tenantId_idx" ON "SevaQuery"("tenantId");

-- CreateIndex
CREATE INDEX "SevaQuery_userId_idx" ON "SevaQuery"("userId");

-- CreateIndex
CREATE INDEX "SevaQuery_createdComplaintId_idx" ON "SevaQuery"("createdComplaintId");

-- CreateIndex
CREATE INDEX "SevaQuery_createdAt_idx" ON "SevaQuery"("createdAt");

-- AddForeignKey
ALTER TABLE "SevaQuery" ADD CONSTRAINT "SevaQuery_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SevaQuery" ADD CONSTRAINT "SevaQuery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SevaQuery" ADD CONSTRAINT "SevaQuery_createdComplaintId_fkey" FOREIGN KEY ("createdComplaintId") REFERENCES "Complaint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
