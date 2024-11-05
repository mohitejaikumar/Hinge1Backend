/*
  Warnings:

  - You are about to drop the column `max_preferred_age` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `min_preferred_age` on the `User` table. All the data in the column will be lost.
  - Added the required column `date_of_birth` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `home_town` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `occupation` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `region` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `religion` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "max_preferred_age",
DROP COLUMN "min_preferred_age",
ADD COLUMN     "date_of_birth" TEXT NOT NULL,
ADD COLUMN     "home_town" TEXT NOT NULL,
ADD COLUMN     "occupation" TEXT NOT NULL,
ADD COLUMN     "region" TEXT NOT NULL,
ADD COLUMN     "religion" TEXT NOT NULL;
