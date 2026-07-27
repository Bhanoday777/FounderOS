"use client";

import { useEffect, useRef, useState } from "react";
import { DebateTurn } from "@/lib/api";

interface Props {
  activeAgents: string[];
  advisorStates: Record<string, { state: string; details: string }>;
  turns: DebateTurn[];
  onSelectAdvisor?: (role: string) => void;
}

const ROLE_COLORS: Record<string, string> = {
  CEO: "#4d5fff",
  CTO: "#9b6dff",
  Investor: "#f59e0b",
  "Product Manager": "#10b981",
  "Marketing Strategist": "#ec4899",
  "Legal Advisor": "#a8a8c0",
  "Finance Advisor": "#3b82f6",
  "Security Architect": "#ef4444",
  "UX Advisor": "#06b6d4",
  "Competition Analyst": "#84cc16",
};

// Shorthand labels for canvas nodes
const ROLE_SHORT: Record<string, string> = {
  CEO: "CEO",
  CTO: "CTO",
  Investor: "VC",
  "Product Manager": "PM",
  "Marketing Strategist": "MKT",
  "Legal Advisor": "LGL",
  "Finance Advisor": "FIN",
  "Security Architect": "SEC",
  "UX Advisor": "UX",
  "Competition Analyst": "CMP",
};

export default function HolographicBoardroom({ activeAgents, advisorStates, turns, onSelectAdvisor }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const hoveredNodeRef = useRef<string | null>(null);
  hoveredNodeRef.current = hoveredNode;
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const nodePositionsRef = useRef<Record<string, { x: number; y: number }>>({});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth || 700);
    let height = (canvas.height = 360);

    let coreRotation = 0;

    // Detect mouse move inside container to tilt projection & track node hovers
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left - width / 2;
      const y = e.clientY - rect.top - height / 2;
      mouseRef.current.targetX = x / (width / 2);
      mouseRef.current.targetY = y / (height / 2);

      // Hover collision check
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      let found: string | null = null;
      for (const [role, pos] of Object.entries(nodePositionsRef.current)) {
        const dist = Math.hypot(clickX - pos.x, clickY - pos.y);
        if (dist < 18) {
          found = role;
          break;
        }
      }
      setHoveredNode(found);
      canvas.style.cursor = found ? "pointer" : "crosshair";
    };

    const handleMouseLeave = () => {
      mouseRef.current.targetX = 0;
      mouseRef.current.targetY = 0;
      setHoveredNode(null);
    };

    const handleMouseClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      for (const [role, pos] of Object.entries(nodePositionsRef.current)) {
        const dist = Math.hypot(clickX - pos.x, clickY - pos.y);
        if (dist < 18) {
          if (onSelectAdvisor) {
            onSelectAdvisor(role);
          }
          break;
        }
      }
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);
    canvas.addEventListener("click", handleMouseClick);

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse interpolation
      const mouse = mouseRef.current;
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      const centerX = width / 2;
      const centerY = height / 2;

      // Circular boardroom layout in 3D perspective space
      const radiusX = width * 0.32;
      const radiusY = height * 0.28;

      // Rotate table perspective based on mouse coordinates
      const tiltOffset = mouse.y * 18;
      const panOffset = mouse.x * 24;

      coreRotation += 0.008;

      // ────────────────────────────────────────────────────────
      // 1. DRAW HOLOGRAPHIC GROUND RING & CORE GRID
      // ────────────────────────────────────────────────────────
      ctx.beginPath();
      ctx.ellipse(centerX + panOffset, centerY + tiltOffset, radiusX, radiusY, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(77, 95, 255, 0.06)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Spinning grid rays from center
      const rayCount = 16;
      for (let i = 0; i < rayCount; i++) {
        const angle = (i / rayCount) * Math.PI * 2 + coreRotation * 0.2;
        const outerX = centerX + panOffset + Math.cos(angle) * radiusX;
        const outerY = centerY + tiltOffset + Math.sin(angle) * radiusY;

        ctx.beginPath();
        ctx.moveTo(centerX + panOffset, centerY + tiltOffset);
        ctx.lineTo(outerX, outerY);
        ctx.strokeStyle = "rgba(77, 95, 255, 0.02)";
        ctx.stroke();
      }

      // Draw Spinning Core Core
      ctx.beginPath();
      ctx.arc(centerX + panOffset, centerY + tiltOffset, 12, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(77, 95, 255, 0.15)";
      ctx.shadowColor = "#4d5fff";
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0; // reset

      // Outer core spinner ring
      ctx.beginPath();
      ctx.ellipse(centerX + panOffset, centerY + tiltOffset, 24, 12, coreRotation * 2, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(155, 109, 255, 0.3)";
      ctx.stroke();

      // ────────────────────────────────────────────────────────
      // 2. COMPUTE ADVISOR POSITION NODE MAP
      // ────────────────────────────────────────────────────────
      const nodes: Record<string, { x: number; y: number; color: string; label: string; state: string }> = {};

      activeAgents.forEach((role, idx) => {
        const angle = (idx / activeAgents.length) * Math.PI * 2 + coreRotation * 0.05;
        // Perspective mapping
        const nodeX = centerX + panOffset + Math.cos(angle) * radiusX;
        const nodeY = centerY + tiltOffset + Math.sin(angle) * radiusY;

        const color = ROLE_COLORS[role] || "#a8a8c0";
        const short = ROLE_SHORT[role] || role;
        const status = advisorStates[role]?.state || "WAITING";

        nodes[role] = { x: nodeX, y: nodeY, color, label: short, state: status };
        nodePositionsRef.current[role] = { x: nodeX, y: nodeY };
      });

      // ────────────────────────────────────────────────────────
      // 3. DRAW DYNAMIC ARGUMENT CONNECTIVE BEAMS
      // ────────────────────────────────────────────────────────
      turns.forEach((turn) => {
        const speakerNode = nodes[turn.role];
        if (!speakerNode) return;

        // Draw connections if the opinion text references other board members
        const text = turn.content.toLowerCase();
        activeAgents.forEach((targetRole) => {
          if (targetRole === turn.role) return;
          const targetNode = nodes[targetRole];
          if (!targetNode) return;

          // Simple semantic parsing for cross-talk references
          const isReferenced =
            text.includes(targetRole.toLowerCase()) ||
            text.includes(ROLE_SHORT[targetRole].toLowerCase()) ||
            (targetRole === "Investor" && text.includes("investor"));

          if (isReferenced) {
            // Draw glowing argument laser beam from speaker to target
            ctx.beginPath();
            ctx.moveTo(speakerNode.x, speakerNode.y);
            ctx.lineTo(targetNode.x, targetNode.y);

            // Colored gradient beam
            const grad = ctx.createLinearGradient(speakerNode.x, speakerNode.y, targetNode.x, targetNode.y);
            grad.addColorStop(0, `${speakerNode.color}60`);
            grad.addColorStop(1, `${targetNode.color}0c`);

            ctx.strokeStyle = grad;
            ctx.lineWidth = speakerNode.state === "SPEAKING" ? 1.5 : 0.6;
            ctx.stroke();

            // Draw tiny particle packet traveling along the beam
            if (speakerNode.state === "SPEAKING") {
              const time = (Date.now() / 1000) % 1; // loop 0 to 1
              const px = speakerNode.x + (targetNode.x - speakerNode.x) * time;
              const py = speakerNode.y + (targetNode.y - speakerNode.y) * time;

              ctx.beginPath();
              ctx.arc(px, py, 2.5, 0, Math.PI * 2);
              ctx.fillStyle = speakerNode.color;
              ctx.shadowColor = speakerNode.color;
              ctx.shadowBlur = 8;
              ctx.fill();
              ctx.shadowBlur = 0;
            }
          }
        });
      });

      // ────────────────────────────────────────────────────────
      // 4. DRAW ADVISOR ORB NODES
      // ────────────────────────────────────────────────────────
      activeAgents.forEach((role) => {
        const node = nodes[role];
        if (!node) return;

        const isSpeaking = node.state === "SPEAKING";
        const isThinking = node.state === "THINKING";

        // Draw node connection string to center core
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(centerX + panOffset, centerY + tiltOffset);
        ctx.strokeStyle = isSpeaking 
          ? `rgba(77, 95, 255, 0.08)` 
          : "rgba(255, 255, 255, 0.02)";
        ctx.stroke();

        // 1. Draw outer glowing pulse rings
        if (isSpeaking) {
          const pulseRadius = 24 + Math.sin(Date.now() * 0.01) * 4;
          ctx.beginPath();
          ctx.arc(node.x, node.y, pulseRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `${node.color}25`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // 2. Draw outer rotating scanner arc for active thinking states
        if (isThinking) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, 18, coreRotation * 4, coreRotation * 4 + Math.PI * 0.6);
          ctx.strokeStyle = node.color;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        // 3. Draw central node background circle
        const isHovered = hoveredNodeRef.current === role;
        ctx.beginPath();
        ctx.arc(node.x, node.y, isHovered ? 16 : 14, 0, Math.PI * 2);
        ctx.fillStyle = isSpeaking || isHovered ? `${node.color}30` : "rgba(10, 10, 24, 0.85)";
        ctx.strokeStyle = isSpeaking || isHovered 
          ? node.color 
          : isThinking 
            ? `${node.color}80` 
            : "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = isSpeaking || isHovered ? 2.0 : 1;
        ctx.shadowColor = isSpeaking || isThinking || isHovered ? node.color : "transparent";
        ctx.shadowBlur = isHovered ? 16 : isSpeaking ? 12 : isThinking ? 6 : 0;
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0; // reset

        // 4. Draw Short Text Abbreviation
        ctx.fillStyle = isSpeaking ? "#ffffff" : "rgba(255, 255, 255, 0.75)";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(node.label, node.x, node.y);

        // 5. Draw status text directly below node
        ctx.fillStyle = isSpeaking 
          ? "#ffffff" 
          : isThinking 
            ? node.color 
            : "rgba(255, 255, 255, 0.35)";
        ctx.font = "700 8px sans-serif";
        ctx.fillText(
          isSpeaking ? "DEBATING" : node.state,
          node.x,
          node.y + 24
        );
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      width = canvas.width = canvas.offsetWidth || 700;
      height = canvas.height = 360;
    };

    window.addEventListener("resize", handleResize);

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [activeAgents, advisorStates, turns]);

  return (
    <div 
      ref={containerRef}
      style={{
        width: "100%",
        padding: "16px",
        background: "rgba(6, 6, 16, 0.45)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        borderRadius: "20px",
        backdropFilter: "blur(12px)",
        marginBottom: "32px",
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* HUD Header */}
      <div 
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "10px",
          fontWeight: 700,
          color: "rgba(255, 255, 255, 0.3)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontFamily: "monospace",
          marginBottom: "12px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.03)",
          paddingBottom: "8px"
        }}
      >
        <span>Board Chamber Projection</span>
        <span>Active Grid Matrix</span>
      </div>

      {hoveredNode && (
        <div style={{
          position: "absolute",
          top: 48,
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(6,6,16,0.95)",
          border: `1px solid ${ROLE_COLORS[hoveredNode] || "#4d5fff"}50`,
          padding: "6px 14px",
          borderRadius: 10,
          pointerEvents: "none",
          textAlign: "center",
          boxShadow: `0 0 16px ${ROLE_COLORS[hoveredNode] || "#4d5fff"}20`,
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{hoveredNode}</div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>Click to Cross-Examine</div>
        </div>
      )}

      <canvas 
        ref={canvasRef} 
        style={{ 
          width: "100%", 
          height: "360px",
          display: "block"
        }} 
      />
    </div>
  );
}
