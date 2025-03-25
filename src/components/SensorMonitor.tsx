'use client';

export function SensorMonitor() {
  return (
    <div className="container sensor-container">
      {/* Блок для средних значений (температура и влажность) */}
      <div className="row">
        <div className="col-12 col-md-6">
          <div className="average-humidity-block">
            <div className="average-humidity-label">Средняя влажность</div>
            <div id="averageHumidity" className="average-humidity-data">-- %</div>
          </div>
        </div>
        <div className="col-12 col-md-6">
          <div className="average-temp-block">
            <div className="average-temp-label">Средняя температура</div>
            <div id="averageTemperature" className="average-temp-data">-- °C</div>
          </div>
        </div>
      </div>

      <h2 className="text-center mb-4">Мониторинг сенсоров</h2>

      <div className="row">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="col-md-3 col-sm-6">
            <div className="data-sensor">
              <div className="data-sensor-label">Sensor:{i} (Температура)</div>
              <div id={`sensor${i}`} className="data-sensor-data">-- °C</div>
            </div>
          </div>
        ))}
      </div>

      <div className="row">
        {[5, 6, 7].map((i) => (
          <div key={i} className="col-md-4 col-sm-6">
            <div className="data-sensor">
              <div className="data-sensor-label">Sensor:{i} (Влажность)</div>
              <div id={`sensor${i}`} className="data-sensor-data">-- %</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
