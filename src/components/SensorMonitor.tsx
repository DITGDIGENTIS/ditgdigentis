"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTint, faThermometerHalf } from "@fortawesome/free-solid-svg-icons";

export function SensorMonitor() {
  return (
    <div className="container sensor-container">
      <div className="row">
        <div className="col-6 col-md-6">
          <div className="top-average-humidity-block">
            <div className="top-average-humidity-label">
              <FontAwesomeIcon icon={faTint} />{" "}
              <span id="averageHumidity" className="top-average-humidity-data">
                -- %
              </span>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-6">
          <div className="top-average-temp-block">
            <div className="top-average-temp-label">
              <FontAwesomeIcon icon={faThermometerHalf} />{" "}
              <span id="averageTemperature" className="top-average-temp-data">
                -- °C
              </span>
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-center mt-4 mb-4">Мониторинг сенсоров:</h2>

      <div className="row">
        <div className="col-3 col-md-3">
        <div className="average-temp-block">
            <div className="average-temp-label"> 
              1:S1 <FontAwesomeIcon icon={faThermometerHalf} /> {""}
              <span id="sensor1" className="average-temp-data">
                -- °C
              </span>
            </div>
          </div>
        </div>
        <div className="col-3 col-md-3">
          <div className="average-temp-block">
            <div className="average-temp-label">
              1:S2 <FontAwesomeIcon icon={faThermometerHalf} /> {" "}
              <span id="sensor2" className="average-temp-data">
                -- °C
              </span>
            </div>
          </div>
        </div>
        <div className="col-3 col-md-3">
        <div className="average-temp-block">
            <div className="average-temp-label">
              2:S1 <FontAwesomeIcon icon={faThermometerHalf} /> {" "}
              <span id="sensor3" className="average-temp-data">
                -- °C
              </span>
            </div>
          </div>
        </div>  
        <div className="col-3 col-md-3">
        <div className="average-temp-block">
            <div className="average-temp-label">
              3:S1 <FontAwesomeIcon icon={faThermometerHalf} /> {" "}
              <span id="sensor4" className="average-temp-data">
                -- °C
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
      <div className="col-4 col-md-4">
        <div className="average-humidity-block">
            <div className="average-humidity-label">
              <FontAwesomeIcon icon={faTint} />{" "}
              <span id="sensor5" className="average-humidity-data">
                -- %
              </span>
            </div>
          </div>
        </div>
        <div className="col-4 col-md-4">
          <div className="average-humidity-block">
            <div className="average-humidity-label">
              <FontAwesomeIcon icon={faTint} />{" "}
              <span id="sensor6" className="average-humidity-data">
                -- %
              </span>
            </div>
          </div>
        </div>

        <div className="col-4 col-md-4">
        <div className="average-humidity-block">
            <div className="average-humidity-label">
              <FontAwesomeIcon icon={faTint} />{" "}
              <span id="sensor7" className="average-humidity-data">
                -- %
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
