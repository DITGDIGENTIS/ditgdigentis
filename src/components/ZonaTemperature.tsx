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

  // Контейнер с flex-версткой
  const containerStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px",
    borderRadius: "10px",
    fontFamily: "Arial, sans-serif",
    maxWidth: "260px",
    margin: "auto",
  };

  // Температура слева
  const temperatureBlockStyle: CSSProperties = {
    color: "#FFF",
    fontSize: "2.5rem",
    fontWeight: "600",
    margin: 0, // убираем лишний отступ
  };

  // Блок для кнопок (справа)
  const buttonsContainerStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  };

  // Стили для самих кнопок
  const buttonStyle: CSSProperties = {
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
  };

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
