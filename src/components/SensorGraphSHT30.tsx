"use client";

import React, { useEffect, useState } from "react";
import * as _ from "lodash";
import moment from "moment";
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
import { DateTime } from "luxon";

interface SensorPoint {
  timestamp: number;
  time: string;
  [key: string]: number | string;
}

interface ChartDataPoint {
  timestamp: number;
  time: string;
  [key: string]: number | string | null;
}

type ColorKey = `${string}_humidity` | `${string}_temperature`;

const generateColors = (sensorIds: string[]): Record<ColorKey, string> => {
  const colors: Record<string, string> = {};
  const humidityColors = [
    "#4dabf7",
    "#339af0",
    "#228be6",
    "#1c7ed6",
    "#1971c2",
  ];
  const temperatureColors = [
    "#ffa500",
    "#ff6b6b",
    "#fa5252",
    "#f03e3e",
    "#e03131",
  ];

  sensorIds.forEach((sensorId, index) => {
    const humidityColor = humidityColors[index % humidityColors.length];
    const temperatureColor =
      temperatureColors[index % temperatureColors.length];

    colors[`${sensorId}_humidity`] = humidityColor;
    colors[`${sensorId}_temperature`] = temperatureColor;
  });

  return colors as Record<ColorKey, string>;
};

export default function SensorGraphSHT30() {
  const [historicalData, setHistoricalData] = useState<SensorPoint[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [sensorIds, setSensorIds] = useState<string[]>([]);
  const [selectedSensors, setSelectedSensors] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    moment().format("YYYY-MM-DD")
  );
  const isMobile = useIsMobile();

  useEffect(() => {
    const newSensorIds = _.uniq(
      historicalData.flatMap((point) =>
        Object.keys(point)
          .filter((key) => key.endsWith("_humidity"))
          .map((key) => key.replace("_humidity", ""))
      )
    );

    if (!_.isEqual(newSensorIds, sensorIds)) {
      setSensorIds(newSensorIds);
      setSelectedSensors(newSensorIds);
    }
  }, [historicalData]);

  const COLORS = React.useMemo(() => generateColors(sensorIds), [sensorIds]);

  const company_name = window.location.pathname.split("/")[1];
  useEffect(() => {
    const fetchData = async () => {
      try {
        const dateStr = DateTime.fromISO(selectedDate).toFormat("yyyy-MM-dd");
        const url = new URL(
          `/api/humidity-readings/${company_name}`,
          window.location.origin
        );
        url.searchParams.set("startDate", dateStr);
        url.searchParams.set("endDate", dateStr);
        url.searchParams.set("company_name", company_name);

        const response = await fetch(url.toString(), { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status}`);
        }

        const readings = await response.json();
        setHistoricalData(readings);
        setLastUpdate(new Date());
      } catch (e) {
        console.error("Failed to fetch sensor data:", e);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [selectedDate]);

  const formatTime = (ts: number | Date) => {
    return moment(ts).format("HH:mm:ss");
  };

  const data = historicalData.map((reading) => {
    const formattedPoint: ChartDataPoint = {
      timestamp:
        typeof reading.timestamp === "number"
          ? reading.timestamp
          : moment(reading.timestamp).valueOf(),
      time: formatTime(reading.timestamp),
    };

    sensorIds.forEach((sensorId) => {
      const humidityKey = `${sensorId}_humidity`;
      const temperatureKey = `${sensorId}_temperature`;

      formattedPoint[humidityKey] = (reading[humidityKey] as number) || null;
      formattedPoint[temperatureKey] =
        (reading[temperatureKey] as number) || null;
    });

    return formattedPoint;
  });

  const maxHumidity = Math.ceil(
    (_.max(
      _.flatMap(data, (point) =>
        sensorIds.map((id) => (point[`${id}_humidity`] as number) || 0)
      )
    ) || 100) * 1.1
  );

  const maxTemperature = Math.ceil(
    (_.max(
      _.flatMap(data, (point) =>
        sensorIds.map((id) => (point[`${id}_temperature`] as number) || 0)
      )
    ) || 50) * 1.1
  );

  const downloadCSV = (sensorId: string) => {
    const filtered = historicalData.filter((d) => {
      const humidityKey = `${sensorId}_humidity`;
      return d[humidityKey] !== undefined;
    });

    if (!filtered.length) {
      return alert(`Немає даних для ${sensorId}`);
    }

    const header = "Час,Температура,Вологість";
    const rows = filtered.map((d) => {
      const humidityKey = `${sensorId}_humidity`;
      const temperatureKey = `${sensorId}_temperature`;
      const humidity = d[humidityKey] as number;
      const temperature = d[temperatureKey] as number;

      return `${formatTime(d.timestamp)},${temperature.toFixed(
        1
      )},${humidity.toFixed(1)}`;
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
          <p className="mb-1">{moment(label).format("HH:mm:ss")}</p>
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
        <h5 className="text-warning mb-0">
          Графік DHT21 (Температура/Вологість)
        </h5>
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
            max={moment().format("YYYY-MM-DD")}
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
        Оновлено: {moment(lastUpdate).format("HH:mm:ss")} | Вибрана дата:{" "}
        {moment(selectedDate).format("DD.MM.YYYY")}
      </div>

      <div className="d-flex flex-wrap gap-3 mb-3">
        {selectedSensors.map((sensorId) => (
          <React.Fragment key={sensorId}>
            <div style={{ color: COLORS[`${sensorId}_humidity` as ColorKey] }}>
              {sensorId} Вологість
            </div>
            <div
              style={{ color: COLORS[`${sensorId}_temperature` as ColorKey] }}
            >
              {sensorId} Температура
            </div>
          </React.Fragment>
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
              yAxisId="left"
              orientation="left"
              stroke="#44c0ff"
              tick={{ fill: "#44c0ff" }}
              label={{
                value: "Вологість (%)",
                angle: -90,
                position: "insideLeft",
                fill: "#44c0ff",
                style: { display: isMobile ? "none" : "block" },
              }}
              domain={[0, maxHumidity]}
              width={isMobile ? 20 : 50}
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
                    moment(timestamp).format("HH:mm")
                  }
                />
                <Tooltip content={<CustomTooltip />} />
                {selectedSensors.map((sensorId) => (
                  <React.Fragment key={sensorId}>
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey={`${sensorId}_humidity`}
                      name={`${sensorId} Вологість`}
                      stroke={COLORS[`${sensorId}_humidity` as ColorKey]}
                      dot={true}
                      unit="%"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey={`${sensorId}_temperature`}
                      name={`${sensorId} Температура`}
                      stroke={COLORS[`${sensorId}_temperature` as ColorKey]}
                      dot={true}
                      unit="°C"
                    />
                  </React.Fragment>
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div
          style={{
            position: "sticky",
            right: 0,
            zIndex: 2,
            backgroundColor: "#2b2b2b",
            paddingLeft: "10px",
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
              orientation="right"
              stroke="#ffa500"
              tick={{ fill: "#ffa500" }}
              label={{
                value: "Температура (°C)",
                angle: 90,
                position: "insideRight",
                fill: "#ffa500",
                style: { display: isMobile ? "none" : "block" },
              }}
              domain={[0, maxTemperature]}
              width={isMobile ? 20 : 50}
            />
          </LineChart>
        </div>
      </div>
    </div>
  );
}
