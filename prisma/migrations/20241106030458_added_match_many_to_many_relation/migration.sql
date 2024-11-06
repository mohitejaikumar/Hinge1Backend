/*
  Warnings:

  - You are about to drop the column `matched_id` on the `User` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_matched_id_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "matched_id";

-- CreateTable
CREATE TABLE "Matches" (
    "id" SERIAL NOT NULL,
    "first_person_id" INTEGER NOT NULL,
    "second_person_id" INTEGER NOT NULL,

    CONSTRAINT "Matches_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Matches" ADD CONSTRAINT "Matches_first_person_id_fkey" FOREIGN KEY ("first_person_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matches" ADD CONSTRAINT "Matches_second_person_id_fkey" FOREIGN KEY ("second_person_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
