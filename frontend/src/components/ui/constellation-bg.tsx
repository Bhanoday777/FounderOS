"use client";

import { useEffect, useRef } from "react";

export default function ConstellationBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, radius: 180 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    
    // Split particles: 45 interactive connected nodes, 350 tiny background stars
    const nodeCount = 45;
    const starCount = 350;

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      baseColor: string;
      isConnectedNode: boolean;
      pulseSpeed: number;
      pulsePhase: number;

      constructor(w: number, h: number, isConnectedNode = false) {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.isConnectedNode = isConnectedNode;
        
        if (this.isConnectedNode) {
          // Connected nodes move slightly faster but still elegantly
          this.vx = (Math.random() - 0.5) * 0.35;
          this.vy = (Math.random() - 0.5) * 0.35;
          this.radius = Math.random() * 1.5 + 1.2;
        } else {
          // Tiny stars drift extremely slowly
          this.vx = (Math.random() - 0.5) * 0.12;
          this.vy = (Math.random() - 0.5) * 0.12;
          this.radius = Math.random() * 0.8 + 0.3;
        }

        this.pulseSpeed = Math.random() * 0.02 + 0.005;
        this.pulsePhase = Math.random() * Math.PI * 2;

        // Colors matching brand palette (Electric Blue, Purple, Emerald)
        const colors = [
          "rgba(77, 95, 255, 0.35)",  // Brand Blue
          "rgba(155, 109, 255, 0.35)", // Purple
          "rgba(16, 185, 129, 0.30)",  // Emerald
        ];
        this.baseColor = colors[Math.floor(Math.random() * colors.length)];
      }

      update(w: number, h: number, mouseX: number, mouseY: number, mouseRadius: number) {
        this.x += this.vx;
        this.y += this.vy;
        this.pulsePhase += this.pulseSpeed;

        // Boundary wrap
        if (this.x < -10) this.x = w + 10;
        if (this.x > w + 10) this.x = -10;
        if (this.y < -10) this.y = h + 10;
        if (this.y > h + 10) this.y = -10;

        // Mouse attraction
        const dx = mouseX - this.x;
        const dy = mouseY - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist < mouseRadius) {
          const force = (mouseRadius - dist) / mouseRadius * 0.04;
          this.x += (dx / dist) * force;
          this.y += (dy / dist) * force;
        }
      }

      draw(c: CanvasRenderingContext2D) {
        c.beginPath();
        const pulse = Math.sin(this.pulsePhase) * 0.2 + 0.8;
        c.arc(this.x, this.y, this.radius * pulse, 0, Math.PI * 2);
        
        if (this.isConnectedNode) {
          c.fillStyle = this.baseColor;
          c.shadowColor = this.baseColor;
          c.shadowBlur = 6;
          c.fill();
          c.shadowBlur = 0; // reset
        } else {
          // Dimmer stars
          c.fillStyle = this.baseColor.replace("0.35", "0.2").replace("0.30", "0.15");
          c.fill();
        }
      }
    }

    const init = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;

      particles = [];
      // Convene active network nodes
      for (let i = 0; i < nodeCount; i++) {
        particles.push(new Particle(w, h, true));
      }
      // Populate background stars
      for (let i = 0; i < starCount; i++) {
        particles.push(new Particle(w, h, false));
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
        radGrad.addColorStop(0, "rgba(124, 58, 237, 0.05)");
        radGrad.addColorStop(1, "rgba(124, 58, 237, 0)");
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

      // Draw connection lines ONLY between active nodes
      const nodes = particles.filter(p => p.isConnectedNode);
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.hypot(dx, dy);

          if (dist < 140) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            
            // Dynamic opacity based on distance
            const alpha = (140 - dist) / 140 * 0.14;
            ctx.strokeStyle = `rgba(155, 109, 255, ${alpha})`;
            ctx.lineWidth = 0.6;
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
      className="pointer-events-none select-none"
      style={{ 
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        mixBlendMode: "screen", 
        zIndex: 1, 
        opacity: 0.12 
      }}
    />
  );
}
