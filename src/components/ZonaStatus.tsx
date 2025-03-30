'use client';

export function ZonaStatus() {
  return (
    <div className="container mt-2">
      <div className="status-container-zona">
        {[1, 2, 3].map((i) => (
          <div key={i} className="zona-sensor">
            <div className="zona-label text-warning">Zona:{i}</div>
            <div
              id={`pi${i}`}
              className="indicator rounded-circle"
              title={`Raspberry Pi ${i}`}
            ></div>
          </div>
        ))}
      </div>
    </div>
  );
}
