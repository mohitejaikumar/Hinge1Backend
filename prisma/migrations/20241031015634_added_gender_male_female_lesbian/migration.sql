/*
  Warnings:

  - The `preferred_gender` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `gender` on the `User` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('Male', 'Female', 'Lesbian');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "gender",
ADD COLUMN     "gender" "Gender" NOT NULL,
DROP COLUMN "preferred_gender",
ADD COLUMN     "preferred_gender" "Gender"[];
