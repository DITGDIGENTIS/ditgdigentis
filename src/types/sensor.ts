export interface SensorDataPoint {
  sensor_id: string;
  temperature: number | null;
  timestamp: Date;
  humidity?: number | null;
  company_name?: string;
}

export interface SensorReadingFilters {
  startDate?: Date;
  endDate?: Date;
  sensorIds?: string[];
  company_name?: string;
}

export interface SensorReading {
  id: number;
  sensor_id: string;
  temperature: number | null;
  humidity?: number;
  timestamp?: Date | null;
  company_name?: string;
  created_at: Date;
  updated_at: Date;
}
