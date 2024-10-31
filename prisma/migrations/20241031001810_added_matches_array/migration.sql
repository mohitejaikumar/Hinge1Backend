/*
  Warnings:

  - Added the required column `comment` to the `Images` table without a default value. This is not possible if the table is not empty.
  - Added the required column `matched_id` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Images" ADD COLUMN     "comment" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "matched_id" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_matched_id_fkey" FOREIGN KEY ("matched_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
