"use client";
import React, { useState, CSSProperties } from "react";

export default function ZonaTemperature() {
  const [temperature, setTemperature] = useState<number>(21);

  const increaseTemperature = () => {
    setTemperature((prevTemp) => prevTemp + 1);
  };

  const decreaseTemperature = () => {
    setTemperature((prevTemp) => prevTemp - 1);
  };

  // Пример простых стилей (TypeScript-friendly)
  const containerStyle: CSSProperties = {
    display: "inline-block",
    padding: "20px",
    borderRadius: "10px",
    border: "2px solid #ccc",
    textAlign: "center",
    fontFamily: "Arial, sans-serif",
    maxWidth: "200px",
    background: "#f9f9f9",
    marginTop: "20px",
    marginBottom: "20px",
    marginLeft: "auto",
    marginRight: "auto",
  };

  const temperatureBlockStyle: CSSProperties = {
    marginBottom: "15px",
    fontSize: "1.5em",
    fontWeight: "bold",
  };

  const buttonStyle: CSSProperties = {
    margin: "0 10px",
    fontSize: "1em",
    padding: "5px 15px",
    cursor: "pointer",
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
