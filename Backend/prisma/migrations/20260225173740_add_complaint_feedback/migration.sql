-- CreateTable
CREATE TABLE "ComplaintFeedback" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplaintFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ComplaintFeedback_complaintId_key" ON "ComplaintFeedback"("complaintId");

-- AddForeignKey
ALTER TABLE "ComplaintFeedback" ADD CONSTRAINT "ComplaintFeedback_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
