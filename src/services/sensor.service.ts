import { PrismaClient } from "../../generated/prisma";
import _ from "lodash";
import { SensorDataPoint, sortByTimestamp } from "./sensor-data.service";

export const createSensorService = () => {
  const prisma = new PrismaClient();

  const createRecords = async (data: SensorDataPoint[]): Promise<void> => {
    try {
      console.log("Starting to create records with data:", data);

      await prisma.$connect();
      console.log("Database connection successful");

      console.log("Creating new records...");
      const createdRecords = await Promise.all(
        _.map(data, async (sensor) => {
          console.log("Creating record for sensor:", sensor);
          try {
            return await prisma.sensorReading.create({
              data: {
                sensor_id: sensor.sensor_id,
                temperature: sensor.temperature,
                humidity: sensor.humidity,
                timestamp: sensor.timestamp || new Date(),
              },
            });
          } catch (error) {
            console.error("Error creating record for sensor:", sensor, error);
            throw error;
          }
        })
      );

      console.log("Successfully created records:", createdRecords);
    } catch (error) {
      console.error(
        "Error in createRecords:",
        error instanceof Error ? error.message : "Unknown error"
      );
      throw error;
    } finally {
      console.log("Disconnecting from database...");
      await prisma.$disconnect();
      console.log("Database disconnected");
    }
  };

  const getAllReadings = async (): Promise<SensorDataPoint[]> => {
    try {
      console.log("Fetching all readings...");
      await prisma.$connect();

      const readings = await prisma.sensorReading.findMany({
        orderBy: { timestamp: "desc" },
        select: {
          sensor_id: true,
          temperature: true,
          humidity: true,
          timestamp: true,
        },
      });

      if (!readings || !Array.isArray(readings)) {
        throw new Error("Invalid readings data received from database");
      }

      const formattedReadings = _.map(readings, (reading) => ({
        sensor_id: String(reading.sensor_id),
        temperature: Number(reading.temperature),
        humidity: Number(reading.humidity),
        timestamp:
          reading.timestamp instanceof Date
            ? reading.timestamp
            : new Date(reading.timestamp),
      }));

      const sortedReadings = sortByTimestamp("desc")(formattedReadings);

      console.log("Successfully fetched readings:", sortedReadings);
      return sortedReadings;
    } catch (error) {
      console.error(
        "Error in getAllReadings:",
        error instanceof Error ? error.message : "Unknown error"
      );
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  };

  return {
    createRecords,
    getAllReadings,
  };
};
