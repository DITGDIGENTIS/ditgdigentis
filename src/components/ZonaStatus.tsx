// src/components/ZonaStatus.tsx
export function ZonaStatus() {
  return (
    <div className="container mt-2">
      <div className="status-container-zona">
        <div className="zona-sensor">
          <div className="zona-label text-warning">Zona:1</div>
          <div id="pi1" className="indicator rounded-circle" title="Raspberry Pi 1"></div>
        </div>
        <div className="zona-sensor">
          <div className="zona-label text-warning">Zona:2</div>
          <div id="pi2" className="indicator rounded-circle" title="Raspberry Pi 2"></div>
        </div>
        <div className="zona-sensor">
          <div className="zona-label text-warning">Zona:3</div>
          <div id="pi3" className="indicator rounded-circle" title="Raspberry Pi 3"></div>
        </div>
      </div>
    </div>
  );
}
