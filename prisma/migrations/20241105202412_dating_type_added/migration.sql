/*
  Warnings:

  - Added the required column `dating_type` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dating_type" TEXT NOT NULL;
