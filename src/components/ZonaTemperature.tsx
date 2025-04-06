"use client";
import { useState } from "react";

export default function ZonaTemperature() {
  const [temperature, setTemperature] = useState(21);

  const increaseTemperature = () => {
    setTemperature((prevTemp) => prevTemp + 1);
  };

  const decreaseTemperature = () => {
    setTemperature((prevTemp) => prevTemp - 1);
  };

  const containerStyle = {
    display: "inline-block",
    padding: "20px",
    borderRadius: "10px",
    border: "2px solid #ccc",
    textAlign: "center",
    fontFamily: "Arial, sans-serif",
    maxWidth: "200px",
    background: "#f9f9f9",
    margin: "20px auto"
  };

  const temperatureBlockStyle = {
    marginBottom: "15px",
    fontSize: "1.5em",
    fontWeight: "bold"
  };

  const buttonStyle = {
    margin: "0 10px",
    fontSize: "1em",
    padding: "5px 15px",
    cursor: "pointer"
  };

  return (
    <div style={containerStyle}>
      <div style={temperatureBlockStyle}>{temperature} °C</div>
      <div>
        <button style={buttonStyle} onClick={decreaseTemperature}>
          -
        </button>
        <button style={buttonStyle} onClick={increaseTemperature}>
          +
        </button>
      </div>
    </div>
  );
}
