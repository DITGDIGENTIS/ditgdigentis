
"use client";

import { FC } from "react";
import { LogoutButton } from "../LogoutButton";

export const Test: FC = () => {
  return (
    <div style={{ padding: "2rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "1rem",
        }}
      >
        <LogoutButton />
      </div>
      <h1>🔐 Страница Test</h1>
      <p>Вы успешно авторизовались.</p>
    </div>
  );
};
