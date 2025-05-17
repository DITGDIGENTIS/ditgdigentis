export type SensorData = {
  id: number;
  sensor_id: string;
  timestamp: number;
  temperature: number;
  humidity: number;
  created_at: string;
}

export type Database = {
  public: {
    Tables: {
      sensor_data: {
        Row: SensorData;
        Insert: Omit<SensorData, 'id' | 'created_at'>;
        Update: Partial<Omit<SensorData, 'id' | 'created_at'>>;
      };
    };
  };
}; 