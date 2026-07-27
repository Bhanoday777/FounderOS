"use client";

import { useState } from "react";
import { TrendingUp, ShieldAlert, Sparkles, RefreshCw, Users, HelpCircle } from "lucide-react";

interface Props {
  marketOpp: number;
  techFeas: number;
  riskScore: number;
}

interface BlackSwanEvent {
  id: string;
  label: string;
  effectLabel: string;
  factor: number;
  color: string;
  icon: any;
  quote: string;
  quoteAuthor: string;
}

const EVENTS: BlackSwanEvent[] = [
  {
    id: "clone",
    label: "Competitor Clone Launches",
    effectLabel: "-25% ARR Haircut",
    factor: 0.75,
    color: "#ef4444",
    icon: ShieldAlert,
    quote: "A competitor cloning us overnight is a massive risk. We need to invest in brand switching barriers immediately.",
    quoteAuthor: "Lead Investor",
  },
  {
    id: "viral",
    label: "Viral Marketing Hype Wave",
    effectLabel: "+40% ARR Boost",
    factor: 1.4,
    color: "#10b981",
    icon: Sparkles,
    quote: "If we capture organic social traction, CAC will plummet. This could hyper-scale our runway.",
    quoteAuthor: "Marketing Strategist",
  },
  {
    id: "regulatory",
    label: "Regulatory Crackdown",
    effectLabel: "-20% Growth Penalty",
    factor: 0.8,
    color: "#f59e0b",
    icon: ShieldAlert,
    quote: "Compliance audits are costly. Standardizing on ISO/HIPAA controls early protects our forecast from disruption.",
    quoteAuthor: "Legal Advisor",
  },
  {
    id: "key_exit",
    label: "Chief Architect Resigns",
    effectLabel: "-15% Dev Delay Impact",
    factor: 0.85,
    color: "#9b6dff",
    icon: Users,
    quote: "Losing key architecture knowledge hurts velocity. Code documentation and knowledge distribution is key.",
    quoteAuthor: "Chief Technology Advisor",
  },
];

export default function VentureSimulator({ marketOpp, techFeas, riskScore }: Props) {
  const [activeEvents, setActiveEvents] = useState<string[]>([]);

  // Derived growth rates from boardroom evaluations
  const baseGrowth = (marketOpp / 100) * 0.35 + 0.05; // range 0.05 - 0.40
  const initialARR = 150000; // $150k starting ARR

  // Calculate Year 0-10 ARR projection arrays
  const calculateProjections = (growthModifier: number) => {
    let arr = initialARR;
    const path = [arr];

    for (let year = 1; year <= 10; year++) {
      // Base growth for this year
      let annualGrowth = baseGrowth * growthModifier;

      // Apply cumulative multipliers from active events starting at Year 2
      let eventFactor = 1.0;
      if (year >= 2) {
        activeEvents.forEach((eventId) => {
          const ev = EVENTS.find((e) => e.id === eventId);
          if (ev) {
            eventFactor *= ev.factor;
          }
        });
      }

      arr = arr * (1 + annualGrowth) * eventFactor;
      path.push(Math.round(arr));
    }
    return path;
  };

  const upsidePath = calculateProjections(1.4);
  const basePath = calculateProjections(1.0);
  const downsidePath = calculateProjections(0.4);

  // SVG Chart sizing
  const width = 500;
  const height = 260;
  const paddingX = 50;
  const paddingY = 30;

  // Max value for scaling
  const maxVal = Math.max(...upsidePath) * 1.05;

  const getCoordinates = (path: number[]) => {
    return path.map((val, idx) => {
      const x = paddingX + (idx / 10) * (width - paddingX * 2);
      const y = height - paddingY - (val / maxVal) * (height - paddingY * 2);
      return { x, y };
    });
  };

  const getPathString = (coords: { x: number; y: number }[]) => {
    return `M ${coords.map((c) => `${c.x},${c.y}`).join(" L ")}`;
  };

  const upsideCoords = getCoordinates(upsidePath);
  const baseCoords = getCoordinates(basePath);
  const downsideCoords = getCoordinates(downsidePath);

  const toggleEvent = (id: string) => {
    setActiveEvents((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const formatCurrency = (val: number) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    return `$${Math.round(val / 1000)}k`;
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24, alignItems: "start" }}>
      {/* Chart Panel */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Monte Carlo Venture Simulator</h3>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>
              10-year probabilistic revenue projection paths based on boardroom scores.
            </p>
          </div>
          {activeEvents.length > 0 && (
            <button 
              className="btn btn-outline" 
              onClick={() => setActiveEvents([])}
              style={{ padding: "4px 10px", fontSize: 10, gap: 4, display: "flex", alignItems: "center" }}
            >
              <RefreshCw size={10} /> Reset Events
            </button>
          )}
        </div>

        {/* SVG Chart */}
        <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 12, padding: "10px 0", border: "1px solid rgba(255,255,255,0.03)" }}>
          <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1.0].map((ratio) => {
              const y = paddingY + ratio * (height - paddingY * 2);
              const labelVal = maxVal * (1 - ratio);
              return (
                <g key={ratio}>
                  <line 
                    x1={paddingX} 
                    y1={y} 
                    x2={width - paddingX} 
                    y2={y} 
                    stroke="rgba(255,255,255,0.04)" 
                    strokeDasharray="4 4" 
                  />
                  <text 
                    x={paddingX - 8} 
                    y={y + 4} 
                    fill="rgba(255,255,255,0.25)" 
                    fontSize="9" 
                    textAnchor="end"
                    fontFamily="monospace"
                  >
                    {formatCurrency(labelVal)}
                  </text>
                </g>
              );
            })}

            {/* Year Labels */}
            {[0, 2, 4, 6, 8, 10].map((year) => {
              const x = paddingX + (year / 10) * (width - paddingX * 2);
              return (
                <text 
                  key={year}
                  x={x} 
                  y={height - paddingY + 16} 
                  fill="rgba(255,255,255,0.25)" 
                  fontSize="9" 
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  Yr {year}
                </text>
              );
            })}

            {/* Projection Paths */}
            <path
              d={getPathString(upsideCoords)}
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
              opacity="0.85"
              style={{ transition: "d 0.35s ease-out" }}
            />
            <path
              d={getPathString(baseCoords)}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="3"
              opacity="0.95"
              style={{ transition: "d 0.35s ease-out" }}
            />
            <path
              d={getPathString(downsideCoords)}
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              opacity="0.85"
              style={{ transition: "d 0.35s ease-out" }}
            />

            {/* Glowing dots at endpoint */}
            <circle cx={upsideCoords[10].x} cy={upsideCoords[10].y} r="4" fill="#10b981" />
            <circle cx={baseCoords[10].x} cy={baseCoords[10].y} r="5" fill="#3b82f6" />
            <circle cx={downsideCoords[10].x} cy={downsideCoords[10].y} r="4" fill="#ef4444" />
          </svg>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 16 }}>
          {[
            { label: "Upside (90th pct)", color: "#10b981", val: upsidePath[10] },
            { label: "Base Case (50th pct)", color: "#3b82f6", val: basePath[10] },
            { label: "Downside (10th pct)", color: "#ef4444", val: downsidePath[10] },
          ].map((item) => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: item.color }} />
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
                {item.label}: <strong style={{ color: "#fff" }}>{formatCurrency(item.val)}</strong>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Black Swan Events Control Panel */}
      <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Black Swan Event Triggers</h3>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>
            Click events to stress-test your business model viability.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {EVENTS.map((ev) => {
            const isActive = activeEvents.includes(ev.id);
            const Icon = ev.icon;

            return (
              <button
                key={ev.id}
                onClick={() => toggleEvent(ev.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "12px 16px",
                  background: isActive ? `${ev.color}15` : "rgba(255,255,255,0.02)",
                  border: isActive ? `1px solid ${ev.color}40` : "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 12,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "all 0.2s ease"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: isActive ? `${ev.color}25` : "rgba(255,255,255,0.04)",
                    display: "flex", alignItems: "center", justifyContent: "center"
                  }}>
                    <Icon size={14} style={{ color: isActive ? ev.color : "rgba(255,255,255,0.4)" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: isActive ? "#fff" : "rgba(255,255,255,0.7)" }}>
                      {ev.label}
                    </div>
                    <div style={{ fontSize: 10, color: isActive ? ev.color : "rgba(255,255,255,0.3)", marginTop: 2 }}>
                      {ev.effectLabel}
                    </div>
                  </div>
                </div>
                <span style={{ 
                  fontSize: 10, fontWeight: 700,
                  color: isActive ? ev.color : "rgba(255,255,255,0.3)",
                  textTransform: "uppercase"
                }}>
                  {isActive ? "Active" : "Trigger"}
                </span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Board Stance Quotes */}
        <div style={{ marginTop: 8 }}>
          <div className="label-xs" style={{ marginBottom: 12 }}>Board Advisory Reaction</div>
          <div style={{
            background: "rgba(255,255,255,0.01)",
            border: "1px solid rgba(255,255,255,0.04)",
            borderRadius: 12,
            padding: 16,
            minHeight: 80,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center"
          }}>
            {activeEvents.length > 0 ? (
              (() => {
                const latestEventId = activeEvents[activeEvents.length - 1];
                const ev = EVENTS.find(e => e.id === latestEventId)!;
                return (
                  <div>
                    <p style={{ fontSize: 11, color: "rgba(244,244,255,0.85)", fontStyle: "italic", lineHeight: 1.5, margin: "0 0 8px" }}>
                      "{ev.quote}"
                    </p>
                    <span style={{ fontSize: 9, fontWeight: 700, color: ev.color, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      — {ev.quoteAuthor} Stance
                    </span>
                  </div>
                );
              })()
            ) : (
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontStyle: "italic", textAlign: "center", margin: 0 }}>
                No stress test events active. Trigger an event to read advisor warnings.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
