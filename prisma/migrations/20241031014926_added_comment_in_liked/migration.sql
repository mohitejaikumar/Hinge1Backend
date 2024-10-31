/*
  Warnings:

  - Added the required column `comment` to the `Likes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Likes" ADD COLUMN     "comment" TEXT NOT NULL;
