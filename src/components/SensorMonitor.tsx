'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTint, faThermometerHalf } from '@fortawesome/free-solid-svg-icons';

export function SensorMonitor() {
  return (
    <div className="container sensor-container">
      <h2 className="text-center">Середні показники:</h2>
      <div className="row">
        <div className="col-6 col-md-6">
          <div className="average-humidity-block">
            <div className="average-humidity-label">
              <FontAwesomeIcon icon={faTint} />{' '}
              <span id="averageHumidity" className="average-humidity-data">-- %</span>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-6">
          <div className="average-temp-block">
            <div className="average-temp-label">
              <FontAwesomeIcon icon={faThermometerHalf} />{' '}
              <span id="averageTemperature" className="average-temp-data">-- °C</span>
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-center mt-4 mb-4">Мониторинг сенсоров:</h2>

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
