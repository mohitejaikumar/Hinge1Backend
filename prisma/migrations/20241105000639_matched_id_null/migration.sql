-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_matched_id_fkey";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "matched_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_matched_id_fkey" FOREIGN KEY ("matched_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
