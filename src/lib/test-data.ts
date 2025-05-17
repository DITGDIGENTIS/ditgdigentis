import { supabase } from './supabase';
import type { Database } from './supabase-types';

const SENSOR_IDS = ['HUM1-1', 'HUM1-2'] as const;

export async function generateAndInsertTestData() {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000; // 24 hours ago
    const interval = 5 * 60 * 1000; // 5 minutes
    const testData = [];

    for (let timestamp = oneDayAgo; timestamp <= now; timestamp += interval) {
        for (const sensorId of SENSOR_IDS) {
            // Generate realistic-looking data
            const baseTemp = 25; // base temperature
            const baseHum = 50;  // base humidity
            const timeProgress = (timestamp - oneDayAgo) / (now - oneDayAgo);
            const tempVariation = Math.sin(timeProgress * Math.PI * 2) * 5;
            const humVariation = Math.cos(timeProgress * Math.PI * 2) * 20;

            testData.push({
                sensor_id: sensorId,
                timestamp: timestamp,
                temperature: baseTemp + tempVariation + Math.random() * 2 - 1,
                humidity: baseHum + humVariation + Math.random() * 4 - 2
            });
        }
    }

    // Insert data in batches
    const batchSize = 100;
    for (let i = 0; i < testData.length; i += batchSize) {
        const batch = testData.slice(i, i + batchSize);
        const { error } = await supabase
            .from('sensor_data')
            .insert(batch);
        
        if (error) {
            console.error('Error inserting test data:', error);
            return false;
        }
    }

    return true;
} 