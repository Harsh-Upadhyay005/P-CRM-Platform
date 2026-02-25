/*
  Warnings:

  - You are about to drop the column `storagePath` on the `ComplaintAttachment` table. All the data in the column will be lost.
  - Added the required column `fileUrl` to the `ComplaintAttachment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ComplaintAttachment" DROP COLUMN "storagePath",
ADD COLUMN     "fileUrl" TEXT NOT NULL;
