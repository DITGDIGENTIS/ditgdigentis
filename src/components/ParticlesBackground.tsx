"use client";

import { useEffect, useState } from "react";
import Particles from "@tsparticles/react";

export default function ParticlesBackground() {
  const [particleCount, setParticleCount] = useState(60);

  useEffect(() => {
    const width = window.innerWidth;
    if (width < 500) {
      setParticleCount(20); // 📱 мобилка
    } else if (width < 1024) {
      setParticleCount(40); // 📲 планшет
    } else {
      setParticleCount(60); // 🖥️ десктоп
    }
  }, []);

  return (
    <div className="fixed inset-0 z-0">
      <Particles
        id="tsparticles"
        options={{
          fullScreen: { enable: false },
          background: { color: "#ffffff" },
          particles: {
            number: {
              value: particleCount,
              density: {
                enable: true,
                width: 800,
                height: 800,
              },
            },
            color: { value: "#00bfff" },
            shape: { type: "circle" },
            opacity: { value: 0.3 },
            size: { value: 3 },
            move: {
              enable: true,
              speed: 1,
              direction: "none",
              outModes: { default: "bounce" },
            },
            links: {
              enable: true,
              distance: 120,
              color: "#00bfff",
              opacity: 0.2,
              width: 1,
            },
          },
          interactivity: {
            events: {
              onHover: { enable: true, mode: "repulse" },
              resize: { enable: true },
            },
            modes: {
              repulse: { distance: 100, duration: 0.4 },
            },
          },
          detectRetina: true,
        }}
      />
    </div>
  );
}
