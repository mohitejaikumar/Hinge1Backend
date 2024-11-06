/*
  Warnings:

  - A unique constraint covering the columns `[liked_by,liked_to]` on the table `Likes` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Likes_liked_by_liked_to_key" ON "Likes"("liked_by", "liked_to");
