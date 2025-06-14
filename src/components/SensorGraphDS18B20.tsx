"use client";

import React, { useEffect, useState } from "react";
import * as _ from "lodash";
import { DateTime } from "luxon";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useIsMobile } from "@/hook/useIsMobile";

interface SensorPoint {
  timestamp: number;
  time: string;
  sensor_id: string;
  temperature: number;
  [key: string]: number | string;
}

interface ChartDataPoint {
  timestamp: number;
  time: string;
  [key: string]: number | string | null;
}

type ColorKey = `${string}_temperature`;

const generateColors = (sensorIds: string[]): Record<ColorKey, string> => {
  const colors: Record<string, string> = {};
  const temperatureColors = [
    "#ffa500",
    "#ff6b6b",
    "#fa5252",
    "#f03e3e",
    "#e03131",
  ];

  sensorIds.forEach((sensorId, index) => {
    const temperatureColor =
      temperatureColors[index % temperatureColors.length];
    colors[`${sensorId}_temperature`] = temperatureColor;
  });

  return colors as Record<ColorKey, string>;
};

export default function SensorGraphDS18B20() {
  const [historicalData, setHistoricalData] = useState<SensorPoint[]>([]);
  const [lastUpdate, setLastUpdate] = useState<DateTime>(DateTime.now());
  const [sensorIds, setSensorIds] = useState<string[]>([]);
  const [selectedSensors, setSelectedSensors] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    DateTime.now().toFormat("yyyy-MM-dd")
  );
  const isMobile = useIsMobile();

  useEffect(() => {
    const newSensorIds = _.uniq(
      historicalData.map((reading) => String(reading.sensor_id))
    );
    if (!_.isEqual(newSensorIds, sensorIds)) {
      setSensorIds(newSensorIds);
      setSelectedSensors(newSensorIds);
    }
  }, [historicalData]);

  const COLORS = React.useMemo(() => generateColors(sensorIds), [sensorIds]);

  const processSensorData = React.useCallback(
    (data: SensorPoint[]): ChartDataPoint[] => {
      if (_.isEmpty(data)) return [];

      const groupedData = _.chain(data)
        .groupBy("sensor_id")
        .mapValues((sensorReadings) => _.sortBy(sensorReadings, "timestamp"))
        .value();

      const allTimestamps = _.uniq(_.map(data, "timestamp")).sort(
        (a, b) => a - b
      );

      const processedData: ChartDataPoint[] = allTimestamps.map(
        (timestamp) => ({
          timestamp,
          time: DateTime.fromISO(timestamp.toString()).toFormat("HH:mm:ss"),
        })
      );

      const sortedSensorIds = _.chain(groupedData).keys().sort().value();

      sortedSensorIds.forEach((sensorId) => {
        const readings = groupedData[sensorId];
        const readingsMap = new Map(
          readings.map((reading) => [reading.timestamp, reading.temperature])
        );

        processedData.forEach((point) => {
          const temperatureKey = `${sensorId}_temperature`;
          point[temperatureKey] = readingsMap.get(point.timestamp) ?? null;
        });
      });

      return processedData;
    },
    []
  );

  const company_name = window.location.pathname.split("/")[1];
  const fetchData = async () => {
    if (!selectedDate) return;

    try {
      const dateStr = DateTime.fromISO(selectedDate).toFormat("yyyy-MM-dd");
      const url = new URL(
        `/api/sensor-readings/${company_name}`,
        window.location.origin
      );
      url.searchParams.set("startDate", dateStr);
      url.searchParams.set("endDate", dateStr);
      url.searchParams.set("company_name", company_name);

      const response = await fetch(url.toString(), { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }
      const data = await response.json();
      setHistoricalData(data);

      setLastUpdate(DateTime.now());
    } catch (error) {
      console.error("Error fetching sensor data:", error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [selectedDate, company_name]);

  const formatTime = (ts: number | Date | string) => {
    if (typeof ts === "string") {
      return DateTime.fromISO(ts).toFormat("HH:mm:ss");
    }
    return DateTime.fromMillis(ts instanceof Date ? ts.getTime() : ts).toFormat(
      "HH:mm:ss"
    );
  };

  const data = React.useMemo(() => {
    return processSensorData(historicalData);
  }, [historicalData, processSensorData]);

  const maxTemperature = Math.ceil(
    (_.max(
      _.flatMap(data, (point) =>
        sensorIds.map((id) => (point[`${id}_temperature`] as number) || 0)
      )
    ) || 50) * 1.1
  );

  const downloadCSV = (sensorId: string) => {
    const filtered = historicalData.filter((d) => {
      const temperatureKey = `${sensorId}_temperature`;
      return d[temperatureKey] !== undefined;
    });

    if (!filtered.length) {
      return alert(`Немає даних для ${sensorId}`);
    }

    const header = "Час,Температура";
    const rows = filtered.map((d) => {
      const temperatureKey = `${sensorId}_temperature`;
      const temperature = d[temperatureKey] as number;

      return `${formatTime(d.timestamp)},${temperature.toFixed(1)}`;
    });

    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sensorId}_${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-dark p-2 border border-secondary rounded">
          <p className="mb-1">
            {DateTime.fromISO(label.toString()).toFormat("HH:mm:ss")}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="mb-0">
              {entry.name}: {entry.value.toFixed(1)}
              {entry.unit}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className="container-fluid py-4"
      style={{ backgroundColor: "#2b2b2b", color: "#fff", borderRadius: 5 }}
    >
      <div className="d-flex flex-wrap gap-3 mb-3 align-items-center justify-content-between">
        <h5 className="text-warning mb-0">Графік DS18B20 (Температура)</h5>
        <div className="d-flex gap-2 flex-wrap">
          {sensorIds.map((id) => (
            <label key={id} className="form-check-label text-light">
              <input
                type="checkbox"
                className="form-check-input me-1"
                checked={selectedSensors.includes(id)}
                onChange={(e) => {
                  const updated = e.target.checked
                    ? [...selectedSensors, id]
                    : selectedSensors.filter((s) => s !== id);
                  setSelectedSensors(updated);
                }}
              />
              {id}
            </label>
          ))}
          <input
            type="date"
            className="form-control"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={DateTime.now().toFormat("yyyy-MM-dd")}
          />
          {sensorIds.map((id) => (
            <button
              key={id}
              className="btn btn-outline-light btn-sm"
              onClick={() => downloadCSV(id)}
            >
              CSV {id}
            </button>
          ))}
        </div>
      </div>

      <div className="text-warning mb-3">
        Оновлено: {lastUpdate.toFormat("HH:mm:ss")} | Вибрана дата:{" "}
        {DateTime.fromFormat(selectedDate, "yyyy-MM-dd").toFormat("dd.MM.yyyy")}
      </div>

      <div className="d-flex flex-wrap gap-3 mb-3">
        {selectedSensors.map((sensorId) => (
          <div
            key={sensorId}
            style={{ color: COLORS[`${sensorId}_temperature` as ColorKey] }}
          >
            {sensorId} Температура
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          width: "100%",
          height: 400,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "sticky",
            left: 0,
            zIndex: 2,
            backgroundColor: "#2b2b2b",
            paddingRight: "10px",
          }}
        >
          <LineChart
            width={isMobile ? 30 : 60}
            height={400}
            data={data}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          >
            <YAxis
              yAxisId="right"
              orientation="left"
              stroke="#ffa500"
              tick={{ fill: "#ffa500" }}
              label={{
                value: "Температура (°C)",
                angle: -90,
                position: "insideLeft",
                fill: "#ffa500",
                style: { display: isMobile ? "none" : "block" },
              }}
              domain={[0, maxTemperature]}
              width={isMobile ? 25 : 50}
            />
          </LineChart>
        </div>

        <div
          style={{
            flex: 1,
            overflowX: "auto",
            overflowY: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              minWidth: Math.max(data.length * 50, 1000),
              padding: "0 10px",
            }}
          >
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={data}
                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis
                  dataKey="timestamp"
                  stroke="#999"
                  tick={{ fill: "#999" }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  tickFormatter={(timestamp) =>
                    DateTime.fromISO(timestamp.toString()).toFormat("HH:mm")
                  }
                />
                <Tooltip content={<CustomTooltip />} />
                {selectedSensors.map((sensorId) => (
                  <Line
                    key={sensorId}
                    yAxisId="right"
                    type="monotone"
                    dataKey={`${sensorId}_temperature`}
                    name={`${sensorId} Температура`}
                    stroke={COLORS[`${sensorId}_temperature` as ColorKey]}
                    dot={true}
                    unit="°C"
                    connectNulls={true}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
