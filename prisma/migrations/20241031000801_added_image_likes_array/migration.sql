/*
  Warnings:

  - Added the required column `bloom_filter` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `geohash` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `location` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `max_preferred_age` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `min_preferred_age` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `prompts` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bloom_filter" TEXT NOT NULL,
ADD COLUMN     "geohash" TEXT NOT NULL,
ADD COLUMN     "location" geography(Point, 4326) NOT NULL,
ADD COLUMN     "max_preferred_age" INTEGER NOT NULL,
ADD COLUMN     "min_preferred_age" INTEGER NOT NULL,
ADD COLUMN     "prompts" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Images" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "Images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Likes" (
    "id" SERIAL NOT NULL,
    "image_id" INTEGER NOT NULL,
    "liked_by" INTEGER NOT NULL,
    "liked_to" INTEGER NOT NULL,

    CONSTRAINT "Likes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "User_age_location_idx" ON "User"("age", "location");

-- AddForeignKey
ALTER TABLE "Images" ADD CONSTRAINT "Images_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Likes" ADD CONSTRAINT "Likes_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "Images"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Likes" ADD CONSTRAINT "Likes_liked_by_fkey" FOREIGN KEY ("liked_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Likes" ADD CONSTRAINT "Likes_liked_to_fkey" FOREIGN KEY ("liked_to") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
