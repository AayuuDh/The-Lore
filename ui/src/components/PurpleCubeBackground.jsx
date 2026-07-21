// For moving cube background

import { useEffect, useRef } from "react";

const PALETTES = {
  purple: {
    dark: {
      background: ["#130922", "#21113f", "#352064", "#4a287d"],
      cubes: [["#b7a3ff", "#6245a7", "#8969e8"]],
      glows: ["139, 123, 255", "88, 59, 201", "190, 151, 255"],
    },
    light: {
      background: ["#f4f0ff", "#e9e0ff", "#d9ccfa", "#c9b5f3"],
      cubes: [["#a58ae8", "#d4c5f5", "#b99dea"]],
      glows: ["139, 103, 221", "188, 156, 235", "113, 85, 180"],
    },
  },
  m365: {
    dark: {
      background: ["#07182b", "#173d73", "#47327d", "#782b67"],
      cubes: [
        ["#ff8a80", "#b72c25", "#f25022"],
        ["#78b9ff", "#075fa8", "#0078d4"],
        ["#9bd36a", "#3f7f18", "#7fba00"],
        ["#ffe37a", "#b88900", "#ffb900"],
      ],
      glows: ["0, 120, 212", "160, 55, 145", "255, 185, 0"],
    },
    light: {
      background: ["#f5f9ff", "#dbeeff", "#eadffa", "#ffe4ee"],
      cubes: [
        ["#f47d64", "#f6b1a2", "#e95a3a"],
        ["#58a7e6", "#afd5f2", "#2488cf"],
        ["#88bd54", "#c1dda4", "#69a42f"],
        ["#e5b52b", "#f5dea0", "#d79c00"],
      ],
      glows: ["0, 120, 212", "183, 84, 170", "255, 185, 0"],
    },
  },
};

export default function PurpleCubeBackground({ theme = "purple", mode = "dark" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    let animationFrameId;
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let cubes = [];
    const palette = PALETTES[theme]?.[mode] ?? PALETTES.purple.dark;

    function resizeCanvas() {
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      createCubes();
    }

    function randomBetween(min, max) {
      return Math.random() * (max - min) + min;
    }

    function createCubes() {
      const count = Math.floor((width * height) / 18000); // adjust density here
      cubes = Array.from({ length: count }, () => {
        const size = randomBetween(8, 20);

        return {
          x: randomBetween(-100, width + 100),
          y: randomBetween(-100, height + 100),
          size,
          speedX: randomBetween(0.03, 0.12),
          speedY: randomBetween(-0.02, 0.05),
          floatOffset: randomBetween(0, Math.PI * 2),
          opacity: randomBetween(0.15, 0.45),
          colorIndex: Math.floor(randomBetween(0, palette.cubes.length)),
        };
      });
    }

    function hexToRgb(hex) {
      const clean = hex.replace("#", "");
      const bigint = parseInt(clean, 16);
      return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255,
      };
    }

    function rgba(hex, alpha) {
      const { r, g, b } = hexToRgb(hex);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function drawCube(x, y, size, alpha, colorIndex) {
      const [top, left, right] = palette.cubes[colorIndex];
      const topColor = rgba(top, alpha);
      const leftColor = rgba(left, alpha);
      const rightColor = rgba(right, alpha);

      const half = size / 2;
      const heightDepth = size * 0.7;

      // top face
      ctx.beginPath();
      ctx.moveTo(x, y - half);
      ctx.lineTo(x + size, y);
      ctx.lineTo(x, y + half);
      ctx.lineTo(x - size, y);
      ctx.closePath();
      ctx.fillStyle = topColor;
      ctx.fill();

      // left face
      ctx.beginPath();
      ctx.moveTo(x - size, y);
      ctx.lineTo(x, y + half);
      ctx.lineTo(x, y + half + heightDepth);
      ctx.lineTo(x - size, y + heightDepth);
      ctx.closePath();
      ctx.fillStyle = leftColor;
      ctx.fill();

      // right face
      ctx.beginPath();
      ctx.moveTo(x + size, y);
      ctx.lineTo(x, y + half);
      ctx.lineTo(x, y + half + heightDepth);
      ctx.lineTo(x + size, y + heightDepth);
      ctx.closePath();
      ctx.fillStyle = rightColor;
      ctx.fill();
    }

    function drawBackground(time) {
      ctx.clearRect(0, 0, width, height);

      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, palette.background[0]);
      gradient.addColorStop(0.35, palette.background[1]);
      gradient.addColorStop(0.7, palette.background[2]);
      gradient.addColorStop(1, palette.background[3]);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // animated glow blobs
      const t = time * 0.00015;

      const glow1X = width * (0.25 + Math.sin(t) * 0.08);
      const glow1Y = height * (0.3 + Math.cos(t * 1.2) * 0.08);

      const glow2X = width * (0.75 + Math.cos(t * 0.85) * 0.08);
      const glow2Y = height * (0.65 + Math.sin(t * 1.1) * 0.07);

      const glow3X = width * (0.5 + Math.sin(t * 0.65) * 0.05);
      const glow3Y = height * (0.8 + Math.cos(t * 0.9) * 0.05);

      const glow1 = ctx.createRadialGradient(glow1X, glow1Y, 0, glow1X, glow1Y, width * 0.35);
      glow1.addColorStop(0, `rgba(${palette.glows[0]}, 0.18)`);
      glow1.addColorStop(1, `rgba(${palette.glows[0]}, 0)`);

      const glow2 = ctx.createRadialGradient(glow2X, glow2Y, 0, glow2X, glow2Y, width * 0.3);
      glow2.addColorStop(0, `rgba(${palette.glows[1]}, 0.16)`);
      glow2.addColorStop(1, `rgba(${palette.glows[1]}, 0)`);

      const glow3 = ctx.createRadialGradient(glow3X, glow3Y, 0, glow3X, glow3Y, width * 0.26);
      glow3.addColorStop(0, `rgba(${palette.glows[2]}, 0.10)`);
      glow3.addColorStop(1, `rgba(${palette.glows[2]}, 0)`);

      ctx.fillStyle = glow1;
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = glow2;
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = glow3;
      ctx.fillRect(0, 0, width, height);
    }

    function animate(time) {
      drawBackground(time);

      for (let i = 0; i < cubes.length; i++) {
        const cube = cubes[i];

        cube.x += cube.speedX;
        cube.y += cube.speedY + Math.sin(time * 0.001 + cube.floatOffset) * 0.03;

        // wrap around screen
        if (cube.x > width + 50) cube.x = -50;
        if (cube.y > height + 80) cube.y = -80;
        if (cube.y < -100) cube.y = height + 100;

        const floatY = Math.sin(time * 0.0015 + cube.floatOffset) * 6;
        drawCube(cube.x, cube.y + floatY, cube.size, cube.opacity, cube.colorIndex);
      }

      animationFrameId = requestAnimationFrame(animate);
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    animationFrameId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme, mode]);

  return <canvas ref={canvasRef} className="purple-cube-bg" />;
}
