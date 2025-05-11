"use client";

import { useState, useEffect } from "react";
import _ from "lodash";
import { SensorDataPoint } from "../services/sensor-data.service";

interface DataPoint {
  time: string;
  temp: number;
  hum: number;
  date: string;
  timestamp: number;
}

const SENSOR_OPTIONS = ["SENSOR1-1", "SENSOR1-2", "SENSOR1-3", "SENSOR1-4"];
const PERIOD_OPTIONS = [
  { label: "1 година", minutes: 60 },
  { label: "1 день", minutes: 1440 },
];

const SENSOR_COLORS: Record<string, string> = {
  "SENSOR1-1": "#00ffff",
  "SENSOR1-2": "#ffcc00",
  "SENSOR1-3": "#ff44aa",
  "SENSOR1-4": "#88ff00",
};

const safeParseDate = (ts: any): Date => {
  try {
    if (ts instanceof Date) return ts;
    if (typeof ts === "string" || typeof ts === "number") {
      const d = new Date(ts);
      if (!isNaN(d.getTime())) return d;
    }
  } catch {}
  return new Date();
};

const fillMissingIntervals = (data: DataPoint[], periodMins: number): DataPoint[] => {
  if (data.length === 0) return [];
  const msStep = 5 * 60 * 1000;
  const now = Date.now();
  const end = Math.floor(now / msStep) * msStep;
  const start = end - periodMins * 60 * 1000;

  const pointsBySlot = new Map<number, DataPoint>();
  data.forEach(d => {
    const rounded = Math.floor(d.timestamp / msStep) * msStep;
    if (!pointsBySlot.has(rounded)) {
      pointsBySlot.set(rounded, d);
    }
  });

  const result: DataPoint[] = [];
  let lastValue: DataPoint | null = null;

  for (let t = start; t <= end; t += msStep) {
    if (pointsBySlot.has(t)) {
      lastValue = pointsBySlot.get(t)!;
      result.push(lastValue);
    } else {
      const date = new Date(t);
      result.push({
        timestamp: t,
        temp: lastValue?.temp ?? NaN,
        hum: lastValue?.hum ?? NaN,
        time: date.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit", hour12: false }),
        date: date.toLocaleDateString("uk-UA"),
      });
    }
  }
  return result;
};
