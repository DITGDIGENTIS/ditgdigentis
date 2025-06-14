-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateTable
CREATE TABLE "HumidityReading" (
    "id" SERIAL NOT NULL,
    "sensor_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "humidity" DOUBLE PRECISION NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "HumidityReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SensorReading" (
    "id" SERIAL NOT NULL,
    "sensor_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "temperature" DOUBLE PRECISION NOT NULL,
    "company_name" TEXT NOT NULL DEFAULT 'furniset',

    CONSTRAINT "SensorReading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HumidityReading_sensor_id_idx" ON "HumidityReading"("sensor_id");

-- CreateIndex
CREATE INDEX "HumidityReading_timestamp_idx" ON "HumidityReading"("timestamp");

-- CreateIndex
CREATE INDEX "SensorReading_sensor_id_idx" ON "SensorReading"("sensor_id");

-- CreateIndex
CREATE INDEX "SensorReading_timestamp_idx" ON "SensorReading"("timestamp");

-- CreateIndex
CREATE INDEX "SensorReading_company_name_idx" ON "SensorReading"("company_name");
