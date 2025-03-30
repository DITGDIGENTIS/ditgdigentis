'use client';

import { useEffect, useState } from 'react';

type ZonaStatusMap = {
  [id: string]: {
    ip: string;
    timestamp: number;
  };
};

export function ZonaStatus() {
  const [zonaStatus, setZonaStatus] = useState<ZonaStatusMap>({});

  const fetchStatus = () => {
    fetch('https://ditgdigentis.vercel.app/api/status', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: ZonaStatusMap) => {
        setZonaStatus(data);
      })
      .catch(() => setZonaStatus({}));
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const now = Date.now();

  return (
    <div className="container mt-2">
      <div className="status-container-zona">
        {Object.entries(zonaStatus).map(([id, zona]) => {
          const online = now - zona.timestamp < 15000;
          return (
            <div key={id} className="zona-sensor">
              <div className="zona-label text-warning">{id}</div>
              <span
                id={id}
                className={`indicator rounded-circle ${online ? 'connected' : ''}`}
                title={`${zona.ip} | ${online ? 'ONLINE' : 'OFFLINE'}`}
              ></span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
