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
        const timeout = 90000;

        const newStatus = {
          zona1: now - (data?.zona1?.timestamp ?? 0) < timeout,
          zona2: now - (data?.zona2?.timestamp ?? 0) < timeout,
          zona3: now - (data?.zona3?.timestamp ?? 0) < timeout,
        };

        const prev = previousStatusRef.current;
        if (
          newStatus.zona1 !== prev.zona1 ||
          newStatus.zona2 !== prev.zona2 ||
          newStatus.zona3 !== prev.zona3
        ) {
          setZonaStatus(newStatus);
          previousStatusRef.current = newStatus;
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container mt-4">
      <div className="status-container-zona">
        {[1, 2, 3].map((i) => {
          const id = `zona${i}`;
          const online = zonaStatus[id as keyof typeof zonaStatus];
          return (
            <div key={id} className="zona-sensor d-flex align-items-center justify-content-center mb-3">
              <div className="zona-label fw-bold fs-5 text-light">Zona {i}</div>

              <div
                className={`status-indicator ${online ? 'online' : 'offline'}`}
                title={online ? 'Online' : 'Offline'}
              >
                {online ? '● ONLINE' : '○ OFFLINE'}
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .status-indicator {
          padding: 6px 14px;
          border-radius: 20px;
          font-weight: 600;
          font-size: 14px;
          color: white;
          transition: all 0.3s ease;
          box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
        }

        .online {
          background-color: #28a745;
          animation: pulseGreen 2s infinite;
        }

        .offline {
          background-color: #dc3545;
          animation: pulseRed 2s infinite;
        }

        @keyframes pulseGreen {
          0% {
            box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(40, 167, 69, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(40, 167, 69, 0);
          }
        }

        @keyframes pulseRed {
          0% {
            box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(220, 53, 69, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(220, 53, 69, 0);
          }
        }
      `}</style>
    </div>
  );
}
