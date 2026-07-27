"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { listSessions, Session } from "@/lib/api";
import { 
  Archive, ArrowRight, Clock, CheckCircle2, AlertCircle, XCircle, 
  BarChart3, Search, Filter, ArrowUpDown, SlidersHorizontal, Trash2
} from "lucide-react";

function fmtDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtAge(ts: number) {
  const diff = Math.floor((Date.now() / 1000) - ts);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function stateConfig(state: string) {
  switch (state) {
    case "COMPLETED": return { label: "Complete",    color: "#10b981", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.2)", icon: CheckCircle2 };
    case "FAILED":    return { label: "Failed",      color: "#ef4444", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.2)",  icon: XCircle      };
    default:          return { label: "In Progress", color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.2)", icon: AlertCircle  };
  }
}

function MiniScoreRing({ score }: { score: number }) {
  const R = 16; const C = R * 2 * Math.PI;
  const color = score >= 70 ? "#10b981" : score >= 45 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ position: "relative", width: 42, height: 42, flexShrink: 0 }}>
      <svg width="42" height="42" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="21" cy="21" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3.5" />
        <circle
          cx="21" cy="21" r={R} fill="none" stroke={color}
          strokeWidth="3.5" strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C - (score / 100) * C}
          style={{ filter: `drop-shadow(0 0 4px ${color}60)` }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 10, fontWeight: 800, color,
      }}>
        {score}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color, icon: Icon }: {
  label: string; value: string | number; sub?: string; color: string; icon: any;
}) {
  return (
    <div className="card" style={{ padding: "20px 22px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          background: `${color}10`, border: `1px solid ${color}20`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={16} style={{ color }} />
        </div>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.04em", color: "#f4f4ff", lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: "rgba(168,168,192,0.5)", marginTop: 6 }}>{sub}</div>
      )}
    </div>
  );
}

export default function VaultPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState("");
  const [domainFilter, setDomainFilter] = useState("ALL");
  const [verdictFilter, setVerdictFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("DATE_DESC");

  useEffect(() => {
    listSessions()
      .then(setSessions)
      .catch(() => setError("Could not load strategy vault."))
      .finally(() => setLoading(false));
  }, []);

  const getVerdict = (score: number | undefined) => {
    if (score == null) return "PENDING";
    if (score >= 70) return "APPROVED";
    if (score >= 45) return "CONDITIONAL";
    return "REJECTED";
  };

  // Get unique domains present in active sessions
  const availableDomains = Array.from(
    new Set(sessions.map((s) => s.domain).filter(Boolean))
  ) as string[];

  const completed = sessions.filter((s) => s.state === "COMPLETED");
  const avgScore = completed.length
    ? Math.round(completed.reduce((a, s) => a + (s.health_score?.overall_score ?? 0), 0) / completed.length)
    : 0;
  const successRate = sessions.length
    ? Math.round((completed.length / sessions.length) * 100)
    : 0;

  const filteredSessions = sessions
    .filter((session) => {
      const matchesSearch =
        session.idea.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDomain = domainFilter === "ALL" || session.domain === domainFilter;
      
      const verdict = getVerdict(session.health_score?.overall_score);
      const matchesVerdict = verdictFilter === "ALL" || verdict === verdictFilter;

      return matchesSearch && matchesDomain && matchesVerdict;
    })
    .sort((a, b) => {
      if (sortBy === "DATE_DESC") return b.created_at - a.created_at;
      if (sortBy === "DATE_ASC") return a.created_at - b.created_at;
      
      const scoreA = a.health_score?.overall_score ?? -1;
      const scoreB = b.health_score?.overall_score ?? -1;
      
      if (sortBy === "SCORE_DESC") return scoreB - scoreA;
      if (sortBy === "SCORE_ASC") return scoreA - scoreB;
      return 0;
    });

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
      {/* ── Page header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ marginBottom: 36 }}
      >
        <div className="label-xs" style={{ marginBottom: 10 }}>FounderOS — Strategy Vault</div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 className="heading-md" style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 10 }}>
              <Archive size={22} style={{ color: "#10b981", filter: "drop-shadow(0 0 8px rgba(16,185,129,0.5))" }} />
              Strategy Vault
            </h1>
            <p style={{ fontSize: 13, color: "rgba(168,168,192,0.6)", lineHeight: 1.5 }}>
              All simulated board sessions. Review past evaluations, criteria analysis, and synthesis plans.
            </p>
          </div>
          <Link href="/" style={{ textDecoration: "none" }}>
            <button className="btn btn-primary" style={{ gap: 8 }}>
              New Session
              <ArrowRight size={14} />
            </button>
          </Link>
        </div>
      </motion.div>

      {/* ── Stat cards ── */}
      {!loading && !error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="stagger"
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14, marginBottom: 32 }}
        >
          <StatCard label="Total Sessions"  value={sessions.length}  color="#4d5fff" icon={BarChart3}    />
          <StatCard label="Completed"        value={completed.length}  color="#10b981" icon={CheckCircle2} sub={`${successRate}% success rate`} />
          <StatCard label="Avg Viability"    value={avgScore > 0 ? `${avgScore}` : "—"} color="#9b6dff" icon={BarChart3} sub="out of 100" />
          <StatCard label="In Progress"      value={sessions.length - completed.length} color="#f59e0b" icon={Clock} />
        </motion.div>
      )}

      {/* ── Filters and Controls Panel ── */}
      {!loading && !error && sessions.length > 0 && (
        <div style={{
          background: "rgba(30, 30, 46, 0.4)",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          borderRadius: 16,
          padding: "16px 20px",
          marginBottom: 20,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.2)"
        }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {/* Search Input */}
            <div style={{ position: "relative", flex: "1 1 280px" }}>
              <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)" }} />
              <input
                type="text"
                placeholder="Search startups by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px 10px 38px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(10, 10, 15, 0.4)",
                  color: "#f4f4ff",
                  fontSize: 13,
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                className="focus:border-[#4d5fff]"
              />
            </div>

            {/* Sort Dropdown */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(10,10,15,0.2)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, padding: "0 12px" }}>
              <ArrowUpDown size={14} style={{ color: "rgba(255,255,255,0.4)" }} />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#f4f4ff",
                  fontSize: 13,
                  outline: "none",
                  cursor: "pointer",
                  padding: "10px 0"
                }}
              >
                <option value="DATE_DESC" style={{ background: "#0a0a0f" }}>Newest First</option>
                <option value="DATE_ASC" style={{ background: "#0a0a0f" }}>Oldest First</option>
                <option value="SCORE_DESC" style={{ background: "#0a0a0f" }}>Highest Viability</option>
                <option value="SCORE_ASC" style={{ background: "#0a0a0f" }}>Lowest Viability</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 12 }}>
            {/* Domain Filter */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Domain:</span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button
                  onClick={() => setDomainFilter("ALL")}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    background: domainFilter === "ALL" ? "#4d5fff" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${domainFilter === "ALL" ? "#4d5fff" : "rgba(255,255,255,0.05)"}`,
                    color: "#f4f4ff",
                    transition: "all 0.15s"
                  }}
                >
                  All
                </button>
                {availableDomains.map((dom) => (
                  <button
                    key={dom}
                    onClick={() => setDomainFilter(dom)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      background: domainFilter === dom ? "#4d5fff" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${domainFilter === dom ? "#4d5fff" : "rgba(255,255,255,0.05)"}`,
                      color: "#f4f4ff",
                      transition: "all 0.15s"
                    }}
                  >
                    {dom}
                  </button>
                ))}
              </div>
            </div>

            {/* Verdict Filter */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Verdict:</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => setVerdictFilter("ALL")}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    background: verdictFilter === "ALL" ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    color: "#f4f4ff",
                    transition: "all 0.15s"
                  }}
                >
                  All
                </button>
                <button
                  onClick={() => setVerdictFilter("APPROVED")}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    background: verdictFilter === "APPROVED" ? "#10b981" : "rgba(16,185,129,0.05)",
                    border: `1px solid ${verdictFilter === "APPROVED" ? "#10b981" : "rgba(16,185,129,0.2)"}`,
                    color: verdictFilter === "APPROVED" ? "#000" : "#10b981",
                    transition: "all 0.15s"
                  }}
                >
                  Approved
                </button>
                <button
                  onClick={() => setVerdictFilter("CONDITIONAL")}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    background: verdictFilter === "CONDITIONAL" ? "#f59e0b" : "rgba(245,158,11,0.05)",
                    border: `1px solid ${verdictFilter === "CONDITIONAL" ? "#f59e0b" : "rgba(245,158,11,0.2)"}`,
                    color: verdictFilter === "CONDITIONAL" ? "#000" : "#f59e0b",
                    transition: "all 0.15s"
                  }}
                >
                  Conditional
                </button>
                <button
                  onClick={() => setVerdictFilter("REJECTED")}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    background: verdictFilter === "REJECTED" ? "#ef4444" : "rgba(239,68,68,0.05)",
                    border: `1px solid ${verdictFilter === "REJECTED" ? "#ef4444" : "rgba(239,68,68,0.2)"}`,
                    color: verdictFilter === "REJECTED" ? "#f4f4ff" : "#ef4444",
                    transition: "all 0.15s"
                  }}
                >
                  Rejected
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── States ── */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[1,2,3].map(i => (
            <div key={i} className="skeleton" style={{ height: 70, borderRadius: 14 }} />
          ))}
        </div>
      )}

      {error && (
        <div style={{
          padding: "24px 28px", borderRadius: 16,
          background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)",
          fontSize: 13, color: "rgba(248,113,113,0.9)",
        }}>
          {error}
        </div>
      )}

      {!loading && !error && sessions.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            textAlign: "center", padding: "72px 32px",
            border: "1px dashed rgba(255,255,255,0.07)", borderRadius: 20,
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>📂</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#f4f4ff", marginBottom: 8 }}>Vault is empty</h3>
          <p style={{ fontSize: 13, color: "rgba(168,168,192,0.5)", marginBottom: 24 }}>
            No simulated board sessions yet. Convene your first executive boardroom session.
          </p>
          <Link href="/">
            <button className="btn btn-primary">Convene Your First Board</button>
          </Link>
        </motion.div>
      )}

      {/* ── Empty search state ── */}
      {!loading && !error && sessions.length > 0 && filteredSessions.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            textAlign: "center", padding: "48px 32px",
            border: "1px dashed rgba(255,255,255,0.05)", borderRadius: 16,
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#f4f4ff", marginBottom: 6 }}>No matching results</h3>
          <p style={{ fontSize: 12, color: "rgba(168,168,192,0.5)" }}>
            Try refining your search terms or adjusting the filter parameters.
          </p>
        </motion.div>
      )}

      {/* ── Session table ── */}
      {!loading && !error && filteredSessions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="card"
          style={{ overflow: "hidden", padding: 0 }}
        >
          <table className="data-table">
            <thead>
              <tr>
                <th>Score</th>
                <th>Startup Concept</th>
                <th>Domain</th>
                <th>Status</th>
                <th>Advisors</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filteredSessions.map((session, i) => {
                  const sc = stateConfig(session.state);
                  const ScIcon = sc.icon;
                  const score = session.health_score?.overall_score;
                  return (
                    <motion.tr
                      key={session.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={{ delay: Math.min(0.03 * i, 0.3) }}
                      style={{ cursor: "pointer" }}
                    >
                      {/* Score ring */}
                      <td>
                        {score != null
                          ? <MiniScoreRing score={score} />
                          : <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>—</span>
                        }
                      </td>

                      {/* Concept */}
                      <td>
                        <div style={{
                          maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          fontSize: 13, fontWeight: 500, color: "#f4f4ff",
                        }}>
                          {session.idea}
                        </div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 2, fontFamily: "monospace" }}>
                          {session.id.slice(0, 8).toUpperCase()}
                        </div>
                      </td>

                      {/* Domain Tag */}
                      <td>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "rgba(168, 168, 255, 0.8)",
                          background: "rgba(77, 95, 255, 0.08)",
                          border: "1px solid rgba(77, 95, 255, 0.15)",
                          padding: "2px 8px",
                          borderRadius: 6
                        }}>
                          {session.domain || "SaaS"}
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          padding: "3px 10px", borderRadius: 9999,
                          background: sc.bg, border: `1px solid ${sc.border}`,
                          fontSize: 11, fontWeight: 600, color: sc.color,
                        }}>
                          <ScIcon size={11} />
                          {sc.label}
                        </span>
                      </td>

                      {/* Advisors */}
                      <td>
                        <span style={{ fontSize: 12, color: "rgba(168,168,192,0.7)" }}>
                          {session.active_agents?.length ?? 4} Advisors
                        </span>
                      </td>

                      {/* Time */}
                      <td>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                          {fmtAge(session.created_at)}
                        </div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 1 }}>
                          {fmtDate(session.created_at)}
                        </div>
                      </td>

                      {/* CTA */}
                      <td>
                        <Link href={`/boardroom/${session.id}`} style={{ textDecoration: "none" }}>
                          <button className="btn btn-ghost" style={{ height: 32, padding: "0 12px", fontSize: 11 }}>
                            View
                            <ArrowRight size={12} />
                          </button>
                        </Link>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </motion.div>
      )}
    </div>
  );
}
