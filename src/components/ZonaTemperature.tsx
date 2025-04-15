"use client";
import React, { useState, CSSProperties, useMemo } from "react";

export default function ZonaTemperature() {
  const [temperature, setTemperature] = useState<number>(21);

  const increaseTemperature = () => {
    setTemperature((prevTemp) => prevTemp + 1);
  };

  const decreaseTemperature = () => {
    setTemperature((prevTemp) => prevTemp - 1);
  };

  // Используем useMemo, чтобы создать объекты стилей один раз
  const containerStyle: CSSProperties = useMemo(
    () => ({
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px",
      borderRadius: "10px",
      fontFamily: "Arial, sans-serif",
      maxWidth: "310px",
      margin: "auto",
    }),
    []
  );

  const temperatureBlockStyle: CSSProperties = useMemo(
    () => ({
      color: "#FFF",
      fontSize: "3rem",
      fontWeight: "600",
      margin: 0,
    }),
    []
  );

  const buttonsContainerStyle: CSSProperties = useMemo(
    () => ({
      display: "flex",
      alignItems: "center",
      gap: "20px",
    }),
    []
  );

  const buttonStyle: CSSProperties = useMemo(
    () => ({
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
      textAlign: "center",
    }),
    []
  );

  return (
    <div style={containerStyle}>
      <div style={temperatureBlockStyle}>{temperature} °C</div>
      <div style={buttonsContainerStyle}>
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
