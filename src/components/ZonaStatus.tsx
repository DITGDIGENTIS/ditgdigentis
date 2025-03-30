'use client';

import { useEffect, useState } from 'react';

export function ZonaStatus() {
  const [zonaStatus, setZonaStatus] = useState({
    zona1: false,
    zona2: false,
    zona3: false,
  });

  const fetchStatus = () => {
    fetch('https://ditgdigentis.vercel.app/api/status', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        const now = Date.now();
        const newStatus = {
          zona1: now - (data?.zona1?.timestamp || 0) < 15000,
          zona2: now - (data?.zona2?.timestamp || 0) < 15000,
          zona3: now - (data?.zona3?.timestamp || 0) < 15000,
        };
        setZonaStatus(newStatus);
      })
      .catch(() => {
        setZonaStatus({ zona1: false, zona2: false, zona3: false });
      });
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container mt-2">
      <div className="status-container-zona">
        {[1, 2, 3].map((i) => {
          const id = `zona${i}`;
          const online = zonaStatus[id as keyof typeof zonaStatus];
          return (
            <div key={id} className="zona-sensor">
              <div className="zona-label text-warning">Zona:{i}</div>
              <span
                id={`pi${i}`}
                className={`indicator rounded-circle ${online ? 'connected' : ''}`}
                title={`Raspberry Pi ${i}`}
              ></span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
