export interface HumidityDataPoint {
  sensor_id: string;
  humidity: number;
  temperature: number;
  timestamp: number | Date;
}

export interface AggregatedDataPoint {
  timestamp: number;
  time: string;
  [key: string]: number | string;
}

export interface ReadingFilters {
  startDate?: Date;
  endDate?: Date;
  sensorIds?: string[];
  groupBy?: "minute" | "hour" | "day" | "week" | "month";
  limit?: number;
  offset?: number;
}

export interface HumidityService {
  createRecords(data: HumidityDataPoint[]): Promise<void>;
  getAggregatedReadings(filters: ReadingFilters): Promise<AggregatedDataPoint[]>;
  deleteSensorRecords(sensorId: string): Promise<number>;
} 