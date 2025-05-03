"use client";

import { useCallback } from "react";
import Particles from "@tsparticles/react";
import { Engine } from "@tsparticles/engine";
import { loadSlim } from "@tsparticles/slim";

export default function ParticlesBackground() {
  const particlesInit = useCallback(async (engine: Engine) => {
    await loadSlim(engine);
  }, []);

  return (
    <Particles
      id="tsparticles"
      init={particlesInit}
      options={{
        fullScreen: { enable: true, zIndex: -1 },
        background: { color: "#ffffff" },
        particles: {
          number: {
            value: 60,
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
            resize: true,
          },
          modes: {
            repulse: { distance: 100, duration: 0.4 },
          },
        },
        detectRetina: true,
      }}
    />
  );
}
