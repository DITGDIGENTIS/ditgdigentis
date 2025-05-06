"use client";

import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  CategoryScale,
  TimeScale,
  ChartData,
  ChartOptions,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import { Line } from "react-chartjs-2";
import { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "chartjs-adapter-date-fns";
import "react-datepicker/dist/react-datepicker.css";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  CategoryScale,
  TimeScale,
  zoomPlugin
);

type SensorReading = {
  id: number;
  sensor_id: string;
  timestamp: number;
  temperature: number;
  humidity: number;
};

type Period = "day" | "week" | "month" | "year";

export default function SensorGraph() {
  const [data, setData] = useState<SensorReading[]>([]);
  const [period, setPeriod] = useState<Period>("day");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("https://barco.com.ua/api/sensor.php", {
          cache: "no-store",
        });
        const json = await res.json();

        const filtered = json.filter((item: SensorReading) => {
          const time = item.timestamp;
          if (startDate && endDate) {
            return time >= startDate.getTime() && time <= endDate.getTime();
          }
          const diff = Date.now() - time;
          if (period === "day") return diff <= 86400000;
          if (period === "week") return diff <= 604800000;
          if (period === "month") return diff <= 2592000000;
          return true;
        });

        setData(filtered);
      } catch (err) {
        console.error("Ошибка загрузки данных:", err);
      }
    };

    fetchData();
  }, [period, startDate, endDate]);

  const chartData: ChartData<"line"> = {
    labels: data.map((d) => new Date(d.timestamp)),
    datasets: [
      {
        label: "Humidity (%)",
        data: data.map((d) => d.humidity),
        borderColor: "rgba(0, 123, 255, 1)",
        backgroundColor: "rgba(0, 123, 255, 0.1)",
        tension: 0.3,
      },
      {
        label: "Temperature (°C)",
        data: data.map((d) => d.temperature),
        borderColor: "rgba(40, 167, 69, 1)",
        backgroundColor: "rgba(40, 167, 69, 0.1)",
        tension: 0.3,
      },
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "nearest",
      axis: "x",
    },
    scales: {
      x: {
        type: "time",
        time: {
          tooltipFormat: "Pp",
          unit: "minute",
        },
        ticks: {
          color: "#333",
        },
        title: {
          display: true,
          text: "Время",
          color: "#333",
        },
        grid: {
          color: "#eee",
        },
      },
      y: {
        ticks: {
          color: "#333",
        },
        title: {
          display: true,
          text: "Значение",
          color: "#333",
        },
        grid: {
          color: "#eee",
        },
      },
    },
    plugins: {
      zoom: {
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: "x",
        },
        pan: {
          enabled: true,
          mode: "x",
        },
      },
      legend: {
        position: "top",
        labels: {
          color: "#333",
        },
      },
      title: {
        display: true,
        text: "Статистика датчика",
        color: "#333",
      },
    },
  };

  return (
    <div style={{ backgroundColor: "#fff", padding: "2rem", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
      <div style={{ marginBottom: "1rem", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1rem" }}>
        <label style={{ fontWeight: 500, color: "#333" }}>Период:</label>
        <select value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
          <option value="day">День</option>
          <option value="week">Неделя</option>
          <option value="month">Месяц</option>
          <option value="year">Год</option>
        </select>

        <label style={{ fontWeight: 500, color: "#333", marginLeft: "1rem" }}>или выбрать даты:</label>
        <DatePicker
          selected={startDate}
          onChange={(date) => setStartDate(date)}
          selectsStart
          startDate={startDate}
          endDate={endDate}
          placeholderText="Начало"
          dateFormat="dd.MM.yyyy"
        />
        <DatePicker
          selected={endDate}
          onChange={(date) => setEndDate(date)}
          selectsEnd
          startDate={startDate || undefined}
          endDate={endDate || undefined}
          placeholderText="Конец"
          dateFormat="dd.MM.yyyy"
          minDate={startDate || undefined}
        />

      </div>

      <div style={{ height: "400px", backgroundColor: "#fff" }}>
        <Line data={chartData} options={options} />
      </div>

      <div className="table-container" style={{ overflowX: "auto", marginTop: "2rem" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "#fff" }}>
          <thead style={{ backgroundColor: "#f8f9fa" }}>
            <tr>
              <th style={{ padding: 10, border: "1px solid #dee2e6", color: "#333" }}>Time</th>
              <th style={{ padding: 10, border: "1px solid #dee2e6", color: "#333" }}>Temperature (°C)</th>
              <th style={{ padding: 10, border: "1px solid #dee2e6", color: "#333" }}>Humidity (%)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.id}>
                <td style={{ padding: 10, border: "1px solid #f1f1f1", color: "#333" }}>
                  {new Date(d.timestamp).toLocaleString()}
                </td>
                <td style={{ padding: 10, border: "1px solid #f1f1f1", color: "#333" }}>{d.temperature}</td>
                <td style={{ padding: 10, border: "1px solid #f1f1f1", color: "#333" }}>{d.humidity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
