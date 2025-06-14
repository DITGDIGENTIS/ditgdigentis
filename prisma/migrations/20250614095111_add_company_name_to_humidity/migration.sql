/*
  Warnings:

  - Added the required column `company_name` to the `HumidityReading` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "HumidityReading_sensor_id_idx";

-- DropIndex
DROP INDEX "HumidityReading_timestamp_idx";

-- AlterTable
ALTER TABLE "HumidityReading" ADD COLUMN     "company_name" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "HumidityReading_sensor_id_timestamp_idx" ON "HumidityReading"("sensor_id", "timestamp");

-- CreateIndex
CREATE INDEX "HumidityReading_company_name_timestamp_idx" ON "HumidityReading"("company_name", "timestamp");
