-- DropIndex
DROP INDEX "SensorReading_company_name_idx";

-- DropIndex
DROP INDEX "SensorReading_sensor_id_idx";

-- DropIndex
DROP INDEX "SensorReading_timestamp_idx";

-- AlterTable
ALTER TABLE "SensorReading" ALTER COLUMN "company_name" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "SensorReading_sensor_id_timestamp_idx" ON "SensorReading"("sensor_id", "timestamp");

-- CreateIndex
CREATE INDEX "SensorReading_company_name_timestamp_idx" ON "SensorReading"("company_name", "timestamp");
