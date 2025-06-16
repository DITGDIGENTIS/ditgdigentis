-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

-- AlterTable
ALTER TABLE "HumidityReading" ALTER COLUMN "humidity" DROP NOT NULL,
ALTER COLUMN "temperature" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SensorReading" ALTER COLUMN "temperature" DROP NOT NULL;
