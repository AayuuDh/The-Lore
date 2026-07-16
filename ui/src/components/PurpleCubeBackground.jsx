// For moving cube background

import { useEffect, useRef } from "react";

export default function PurpleCubeBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    let animationFrameId;
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let cubes = [];

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
          hueShift: randomBetween(-10, 10),
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

    function drawCube(x, y, size, alpha) {
      // Purple cube shades
      const topColor = rgba("#8B7BFF", alpha);
      const leftColor = rgba("#4B358F", alpha);
      const rightColor = rgba("#6D5DF6", alpha);

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
      gradient.addColorStop(0, "#1F1636");
      gradient.addColorStop(0.35, "#2B1E58");
      gradient.addColorStop(0.7, "#3A2878");
      gradient.addColorStop(1, "#4E2C95");

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
      glow1.addColorStop(0, "rgba(139, 123, 255, 0.18)");
      glow1.addColorStop(1, "rgba(139, 123, 255, 0)");

      const glow2 = ctx.createRadialGradient(glow2X, glow2Y, 0, glow2X, glow2Y, width * 0.3);
      glow2.addColorStop(0, "rgba(88, 59, 201, 0.16)");
      glow2.addColorStop(1, "rgba(88, 59, 201, 0)");

      const glow3 = ctx.createRadialGradient(glow3X, glow3Y, 0, glow3X, glow3Y, width * 0.26);
      glow3.addColorStop(0, "rgba(173, 142, 255, 0.10)");
      glow3.addColorStop(1, "rgba(173, 142, 255, 0)");

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
        drawCube(cube.x, cube.y + floatY, cube.size, cube.opacity);
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
  }, []);

  return <canvas ref={canvasRef} className="purple-cube-bg" />;
}
