"use client";

import Particles from "@tsparticles/react";

export default function ParticlesBackground() {
  const width = typeof window !== "undefined" ? window.innerWidth : 1200;

  const particleCount = width < 500 ? 20 : width < 1024 ? 40 : 60;

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
