export interface SensorDataPoint {
  sensor_id: string;
  temperature: number;
  timestamp: Date;
  humidity?: number;
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
  temperature: number;
  humidity?: number;
  timestamp: Date;
  company_name?: string;
  created_at: Date;
  updated_at: Date;
}
