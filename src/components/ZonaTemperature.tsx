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
    display: "block",
    padding: "10px",
    borderRadius: "10px",
    // border: "2px solid #FFF",
    textAlign: "center",
    fontFamily: "Arial, sans-serif",
    maxWidth: "200px",
    // background: "#2B2B2B",
    margin: "auto",
  };

  const temperatureBlockStyle: CSSProperties = {
    color: "#FFF",
    marginBottom: "15px",
    fontSize: "2.5rem",
    fontWeight: "600",
  };

  // Новый, более «красивый» стиль для кнопок
  const buttonStyle: CSSProperties = {
    margin: "0 10px",
    width: "50px",
    fontSize: "1.6em",
    padding: "5px 16px",
    cursor: "pointer",
    backgroundColor: "#2B2B2B",
    color: "#fff",
    border: "1px solid #999",
    borderRadius: "8px",
    boxShadow: "0 0 5px rgba(255, 215, 0, 0.3)",
    transition: "background-color 0.3s ease, box-shadow 0.3s ease",
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
