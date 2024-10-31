/*
  Warnings:

  - Added the required column `custom_radius` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "custom_radius" INTEGER NOT NULL;
