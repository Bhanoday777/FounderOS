"use client";

import { useEffect, useRef } from "react";

export default function ConstellationBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, radius: 150 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    const particleCount = 75;

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      baseColor: string;

      constructor(w: number, h: number) {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        // Slow, elegant drift
        this.vx = (Math.random() - 0.5) * 0.28;
        this.vy = (Math.random() - 0.5) * 0.28;
        this.radius = Math.random() * 1.5 + 0.8;
        
        // Curated HSL colors matching CEO (blue), CTO (purple), PM (emerald)
        const colors = [
          "rgba(59, 130, 246, 0.45)",  // Blue
          "rgba(168, 85, 247, 0.45)",  // Purple
          "rgba(16, 185, 129, 0.45)",  // Emerald
        ];
        this.baseColor = colors[Math.floor(Math.random() * colors.length)];
      }

      update(w: number, h: number, mouseX: number, mouseY: number, mouseRadius: number) {
        this.x += this.vx;
        this.y += this.vy;

        // Boundary bounce
        if (this.x < 0 || this.x > w) this.vx *= -1;
        if (this.y < 0 || this.y > h) this.vy *= -1;

        // Subtle pull toward mouse cursor
        const dx = mouseX - this.x;
        const dy = mouseY - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist < mouseRadius) {
          const force = (mouseRadius - dist) / mouseRadius * 0.08;
          this.x += (dx / dist) * force;
          this.y += (dy / dist) * force;
        }
      }

      draw(c: CanvasRenderingContext2D) {
        c.beginPath();
        c.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        c.fillStyle = this.baseColor;
        c.shadowColor = this.baseColor;
        c.shadowBlur = 4;
        c.fill();
        c.shadowBlur = 0; // reset
      }
    }

    const init = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;

      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle(w, h));
      }
    };

    const animate = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Mouse interactive radial cursor glow
      const { x: mx, y: my, radius: mr } = mouseRef.current;
      if (mx > 0 && my > 0) {
        const radGrad = ctx.createRadialGradient(mx, my, 0, mx, my, mr);
        radGrad.addColorStop(0, "rgba(99, 102, 241, 0.04)");
        radGrad.addColorStop(1, "rgba(99, 102, 241, 0)");
        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(mx, my, mr, 0, Math.PI * 2);
        ctx.fill();
      }

      // Update & Draw particles
      particles.forEach((p) => {
        p.update(w, h, mx, my, mr);
        p.draw(ctx);
      });

      // Draw connection lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.hypot(dx, dy);

          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            // Dynamic opacity based on distance
            const alpha = (110 - dist) / 110 * 0.12;
            ctx.strokeStyle = `rgba(168, 85, 247, ${alpha})`;
            ctx.lineWidth = 0.55;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      init();
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouseRef.current.x = -1000;
      mouseRef.current.y = -1000;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    init();
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none select-none"
      style={{ mixBlendMode: "screen" }}
    />
  );
}
