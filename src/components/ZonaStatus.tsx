'use client';

import { useEffect, useState, useRef } from 'react';

export function ZonaStatus() {
  const [zonaStatus, setZonaStatus] = useState({
    zona1: false,
    zona2: false,
    zona3: false,
  });

  const previousStatusRef = useRef(zonaStatus);

  const fetchStatus = () => {
    fetch('https://ditgdigentis.vercel.app/api/status', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        const now = Date.now();
        const timeout = 90000; // 90 секунд

        const newStatus = {
          zona1: now - (data?.zona1?.timestamp ?? 0) < timeout,
          zona2: now - (data?.zona2?.timestamp ?? 0) < timeout,
          zona3: now - (data?.zona3?.timestamp ?? 0) < timeout,
        };

        const prev = previousStatusRef.current;

        // 💡 Мінімізація флікання — оновлюємо стан лише при зміні
        if (
          newStatus.zona1 !== prev.zona1 ||
          newStatus.zona2 !== prev.zona2 ||
          newStatus.zona3 !== prev.zona3
        ) {
          setZonaStatus(newStatus);
          previousStatusRef.current = newStatus;
        }
      })
      .catch(() => {
        // 🛡️ Нічого не оновлюємо при помилці — кнопка лишається стабільною
      });
  };

  useEffect(() => {
    fetchStatus(); // первинне оновлення
    const interval = setInterval(fetchStatus, 5000); // оновлення кожні 5 секунд
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container mt-2">
      <div className="status-container-zona">
        {[1, 2, 3].map((i) => {
          const id = `zona${i}`;
          const online = zonaStatus[id as keyof typeof zonaStatus];
          return (
            <div key={id} className="zona-sensor d-flex align-items-center mb-2">
              <div className="zona-label text-warning me-2">Zona {i}</div>
              <span
                id={`pi${i}`}
                className={`indicator rounded-circle ${online ? 'connected' : 'disconnected'}`}
                title={`Raspberry Pi ${i}`}
              ></span>
              <span className="ms-2 small text-muted">{online ? 'Онлайн' : 'Офлайн'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
