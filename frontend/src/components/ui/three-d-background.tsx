"use client";

import { useEffect, useRef } from "react";

export default function ThreeDBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // 3D projection parameters
    const fov = 400;
    const cameraZ = 300;

    // Gyroscope rotation angles
    let angleX = 0;
    let angleY = 0;
    let angleZ = 0;

    // Grid animation offsets
    let gridOffsetZ = 0;
    const gridSpeed = 0.8;

    // Helper to project 3D points to 2D screen coordinates
    const project = (x: number, y: number, z: number, centerX: number, centerY: number) => {
      const scale = fov / (z + cameraZ);
      return {
        x: x * scale + centerX,
        y: y * scale + centerY,
        scale,
      };
    };

    // Rotate point around X axis
    const rotateX = (x: number, y: number, z: number, angle: number) => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return { x, y: y * cos - z * sin, z: y * sin + z * cos };
    };

    // Rotate point around Y axis
    const rotateY = (x: number, y: number, z: number, angle: number) => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return { x: x * cos + z * sin, y, z: -x * sin + z * cos };
    };

    // Rotate point around Z axis
    const rotateZ = (x: number, y: number, z: number, angle: number) => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return { x: x * cos - y * sin, y: x * sin + y * cos, z };
    };

    // Generate points on a 3D ring
    const generateRingPoints = (radius: number, count: number, normalPlane: "xy" | "yz" | "xz") => {
      const points = [];
      for (let i = 0; i < count; i++) {
        const theta = (i / count) * Math.PI * 2;
        if (normalPlane === "xy") {
          points.push({ x: Math.cos(theta) * radius, y: Math.sin(theta) * radius, z: 0 });
        } else if (normalPlane === "yz") {
          points.push({ x: 0, y: Math.cos(theta) * radius, z: Math.sin(theta) * radius });
        } else {
          points.push({ x: Math.cos(theta) * radius, y: 0, z: Math.sin(theta) * radius });
        }
      }
      return points;
    };

    // Instantiate Gyroscope rings
    const ringRadius1 = 120;
    const ringRadius2 = 90;
    const ringRadius3 = 60;
    const ringPoints1 = generateRingPoints(ringRadius1, 40, "xz");
    const ringPoints2 = generateRingPoints(ringRadius2, 30, "yz");
    const ringPoints3 = generateRingPoints(ringRadius3, 20, "xy");

    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse coordinates around center
      mouseRef.current.targetX = (e.clientX - width / 2) / (width / 2);
      mouseRef.current.targetY = (e.clientY - height / 2) / (height / 2);
    };

    window.addEventListener("mousemove", handleMouseMove);

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Interpolate mouse coordinates for smooth lag effect
      const mouse = mouseRef.current;
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      // Slowly increment base angles
      angleX += 0.005;
      angleY += 0.007;
      angleZ += 0.003;

      // Mouse influence on rotation angles
      const finalAngleX = angleX + mouse.y * 0.3;
      const finalAngleY = angleY + mouse.x * 0.3;

      // Center coords for 3D elements
      const centerX = width * 0.8; // positioned in the top-right quadrant
      const centerY = height * 0.35;

      // ────────────────────────────────────────────────────────
      // RENDER 3D GYROSCOPE
      // ────────────────────────────────────────────────────────
      const drawRing = (points: typeof ringPoints1, rx: number, ry: number, rz: number, strokeColor: string) => {
        ctx.beginPath();
        for (let i = 0; i <= points.length; i++) {
          const pt = points[i % points.length];
          // Rotate ring
          let r = rotateX(pt.x, pt.y, pt.z, rx);
          r = rotateY(r.x, r.y, r.z, ry);
          r = rotateZ(r.x, r.y, r.z, rz);

          // Project
          const proj = project(r.x, r.y, r.z, centerX, centerY);

          if (i === 0) {
            ctx.moveTo(proj.x, proj.y);
          } else {
            ctx.lineTo(proj.x, proj.y);
          }
        }
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1;
        ctx.stroke();
      };

      // Draw outer blue ring
      drawRing(ringPoints1, finalAngleX, finalAngleY, angleZ, "rgba(77, 95, 255, 0.25)");
      // Draw middle violet ring
      drawRing(ringPoints2, finalAngleX * 0.8, -finalAngleY * 1.2, angleZ * 1.5, "rgba(155, 109, 255, 0.20)");
      // Draw inner emerald ring
      drawRing(ringPoints3, -finalAngleX * 1.1, finalAngleY * 0.9, -angleZ * 0.8, "rgba(16, 185, 129, 0.15)");

      // ────────────────────────────────────────────────────────
      // RENDER 3D HORIZON GRID (Vaporwave style ground plane)
      // ────────────────────────────────────────────────────────
      const gridCenterY = height * 0.55; // horizon height
      const gridPlaneY = 220; // vertical offset of grid plane
      const gridZMax = 1200; // view distance
      const gridZMin = 100;
      const spacingX = 80;
      const lineCountX = 24;

      gridOffsetZ -= gridSpeed;
      if (gridOffsetZ < -100) {
        gridOffsetZ += 100;
      }

      // Draw horizontal lines moving closer
      for (let z = gridZMax; z >= gridZMin; z -= 80) {
        const currentZ = z + gridOffsetZ;
        const scale = fov / currentZ;
        const screenY = gridCenterY + gridPlaneY * scale;

        // Horizon fade opacity calculation
        const opacity = Math.max(0, 1 - currentZ / gridZMax) * 0.08;
        ctx.beginPath();
        ctx.moveTo(0, screenY);
        ctx.lineTo(width, screenY);
        ctx.strokeStyle = `rgba(124, 58, 237, ${opacity})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // Draw vertical perspective grid lines
      for (let i = -lineCountX / 2; i <= lineCountX / 2; i++) {
        const x = i * spacingX;

        // Line endpoints in 3D
        const startProj = project(x, gridPlaneY, gridZMin, width / 2, gridCenterY);
        const endProj = project(x, gridPlaneY, gridZMax, width / 2, gridCenterY);

        // Horizon fade gradient
        const grad = ctx.createLinearGradient(startProj.x, startProj.y, endProj.x, endProj.y);
        grad.addColorStop(0, "rgba(124, 58, 237, 0.08)");
        grad.addColorStop(1, "rgba(124, 58, 237, 0)");

        ctx.beginPath();
        ctx.moveTo(startProj.x, startProj.y);
        ctx.lineTo(endProj.x, endProj.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    // Run animation loop
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none select-none"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        mixBlendMode: "screen",
        zIndex: 0,
        opacity: 0.8,
      }}
    />
  );
}
