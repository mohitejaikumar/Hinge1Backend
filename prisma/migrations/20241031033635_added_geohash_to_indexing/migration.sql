-- DropIndex
DROP INDEX "User_age_location_idx";

-- CreateIndex
CREATE INDEX "User_age_geohash_idx" ON "User"("age", "geohash");
