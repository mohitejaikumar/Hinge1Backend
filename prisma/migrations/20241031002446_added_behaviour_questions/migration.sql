/*
  Warnings:

  - You are about to drop the column `prompts` on the `User` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Likes" DROP CONSTRAINT "Likes_image_id_fkey";

-- AlterTable
ALTER TABLE "Likes" ADD COLUMN     "behaviour_id" INTEGER,
ALTER COLUMN "image_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "prompts";

-- CreateTable
CREATE TABLE "Behaviour" (
    "id" SERIAL NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "Behaviour_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Behaviour" ADD CONSTRAINT "Behaviour_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Likes" ADD CONSTRAINT "Likes_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "Images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Likes" ADD CONSTRAINT "Likes_behaviour_id_fkey" FOREIGN KEY ("behaviour_id") REFERENCES "Behaviour"("id") ON DELETE SET NULL ON UPDATE CASCADE;
