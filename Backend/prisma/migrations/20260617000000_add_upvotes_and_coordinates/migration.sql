-- Add upvotes, latitude, longitude to Complaint
ALTER TABLE "Complaint" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "Complaint" ADD COLUMN "longitude" DOUBLE PRECISION;
ALTER TABLE "Complaint" ADD COLUMN "upvotes" INTEGER NOT NULL DEFAULT 0;

-- Create ComplaintUpvote table
CREATE TABLE "ComplaintUpvote" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "citizenEmail" TEXT NOT NULL,
    "citizenPhone" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplaintUpvote_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint (one upvote per email per complaint)
CREATE UNIQUE INDEX "ComplaintUpvote_complaintId_citizenEmail_key" ON "ComplaintUpvote"("complaintId", "citizenEmail");

-- Create indexes
CREATE INDEX "ComplaintUpvote_complaintId_idx" ON "ComplaintUpvote"("complaintId");
CREATE INDEX "ComplaintUpvote_citizenEmail_idx" ON "ComplaintUpvote"("citizenEmail");
CREATE INDEX "Complaint_latitude_longitude_idx" ON "Complaint"("latitude", "longitude");
CREATE INDEX "Complaint_category_locality_idx" ON "Complaint"("category", "locality");

-- Add foreign key
ALTER TABLE "ComplaintUpvote" ADD CONSTRAINT "ComplaintUpvote_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
