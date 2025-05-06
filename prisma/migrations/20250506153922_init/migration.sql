-- CreateTable
CREATE TABLE "SensorReading" (
    "id" SERIAL NOT NULL,
    "sensor_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "temperature" DOUBLE PRECISION NOT NULL,
    "humidity" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SensorReading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SensorReading_sensor_id_timestamp_idx" ON "SensorReading"("sensor_id", "timestamp");
