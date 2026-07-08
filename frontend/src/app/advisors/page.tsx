"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Briefcase, Cpu, TrendingUp, Layers, Megaphone, Scale, Coins, ShieldAlert, Palette, Compass, ChevronDown, ChevronUp, Sparkles } from "lucide-react";

const ADVISORS = [
  {
    role: "CEO",
    title: "Chief Executive Officer",
    label: "Vision & Strategy",
    icon: Briefcase,
    accent: "#4d5fff",
    border: "rgba(74,95,255,0.2)",
    glow: "rgba(74,95,255,0.08)",
    weight: 30,
    focus: ["Innovation Index", "Consensus Steering", "Value Proposition"],
    stance: "Acts as the strategic moderator. Targets high-intent customer segments, focuses on overall alignment, and forces the board toward pivot designs when other members raise critical feasibility or market moat flags.",
    promptBio: "You are the Chief Executive Officer of the Board. You prioritize long-term vision and form a unified pivot strategy when execution flags are raised by the CTO or Investor.",
    sim: {
      tech:     { score: 84, note: "Strong strategic upside with enterprise partnerships.", niche: "API developer squads",     scope: "B2B dashboard connector",       budget: "Low host costs initially" },
      physical: { score: 80, note: "Hardware renting targets a high-intent segment.",       niche: "Remote employees",          scope: "B2B workforce workstations",    budget: "Upfront equipment purchasing" },
    },
  },
  {
    role: "CTO",
    title: "Chief Technology Officer",
    label: "System Feasibility",
    icon: Cpu,
    accent: "#9b6dff",
    border: "rgba(155,109,255,0.2)",
    glow: "rgba(155,109,255,0.08)",
    weight: 25,
    focus: ["Tech Feasibility", "System Architecture", "Logistics Bottlenecks"],
    stance: "Audits hardware and software logistics. Heavily challenges the concept's complexity, warehousing infrastructure, automated scanning logs, and guides target server topologies.",
    promptBio: "You are the Chief Technology Officer of the Board. You evaluate technical dependencies, developer tool overhead, API request caching pipelines, database structures, and logistics.",
    sim: {
      tech:     { score: 74, note: "Serverless latency and rate limits will bottle scaling.", niche: "Engineering leads",       scope: "Self-hosted Docker image",       budget: "High token costs" },
      physical: { score: 68, note: "Inventory processing will be slow without scanners.",     niche: "Keyboard enthusiasts",    scope: "Custom keycap catalog systems",  budget: "Sanitization labor" },
    },
  },
  {
    role: "Investor",
    title: "Lead Venture Capitalist",
    label: "Economic & TAM",
    icon: TrendingUp,
    accent: "#f59e0b",
    border: "rgba(245,158,11,0.2)",
    glow: "rgba(245,158,11,0.06)",
    weight: 25,
    focus: ["Venture Scalability", "Financial Margins", "Competitive Moat"],
    stance: "Ensures high defensibility and capital efficiency. Scrutinizes target margins, shipping cost write-offs, and challenges concepts that act as basic API wrappers.",
    promptBio: "You are the Lead Venture Capitalist of the Board. You demand high capital margins, low CAC-to-LTV payback timelines, and unique data moats that shield the platform.",
    sim: {
      tech:     { score: 55, note: "Weak moat. Basic wrapper has high platform risk.", niche: "Indie builders",        scope: "Custom fine-tune loops",        budget: "High GTM ads budget" },
      physical: { score: 50, note: "Heavy CAPEX. Margins crushed by shipping overhead.", niche: "Individual engineers", scope: "Buyout rent-to-own plans",     budget: "Stock procurement burn" },
    },
  },
  {
    role: "PM",
    title: "Lead Product Manager",
    label: "MVP & Scope",
    icon: Layers,
    accent: "#10b981",
    border: "rgba(16,185,129,0.2)",
    glow: "rgba(16,185,129,0.06)",
    weight: 20,
    focus: ["MVP Scope Pruning", "User Feedback Loops", "Pilot Launch Speed"],
    stance: "Advocates for the user and rapid validation. Insists on cutting scope to start with minor pilots to prove user acquisition loops fast.",
    promptBio: "You are the Lead Product Manager of the Board. You prioritize short development cycles, early qualitative user validation, and lean MVP rollouts.",
    sim: {
      tech:     { score: 80, note: "Release a simple workspace widget first, capture analytics.", niche: "Freelancer builders", scope: "Single page mock",        budget: "Pre-seed pilot budget" },
      physical: { score: 82, note: "Restrict pilot strictly to 10 keyboard models.",              niche: "Writers and coders",  scope: "10-unit pilot launch",   budget: "Minor pre-orders offset" },
    },
  },
  {
    role: "Marketing Strategist",
    title: "Growth & Marketing Strategist",
    label: "GTM & Acquisition",
    icon: Megaphone,
    accent: "#ec4899",
    border: "rgba(236,72,153,0.2)",
    glow: "rgba(236,72,153,0.06)",
    weight: 15,
    focus: ["GTM Strategy", "Organic Acquisition", "Brand Positioning"],
    stance: "Refuses paid-ads-first GTM strategies. Demands an organic content flywheel with measurable k-factor and community-led growth before any marketing budget is deployed.",
    promptBio: "You are the Growth & Marketing Strategist. You prioritize organic acquisition loops, k-factor virality, and content moats over paid ad budgets.",
    sim: {
      tech:     { score: 78, note: "Content SEO and PLG motion viable for developer tools.", niche: "Developer communities",  scope: "SEO + community flywheel",        budget: "$0 paid ads, $3K content" },
      physical: { score: 62, note: "Physical products require higher CAC through retail channels.", niche: "Enthusiast forums",  scope: "Community seeding + unboxing", budget: "Influencer + event budget" },
    },
  },
  {
    role: "Finance Advisor",
    title: "Chief Finance Officer Advisor",
    label: "Unit Economics & Margins",
    icon: Coins,
    accent: "#3b82f6",
    border: "rgba(59,130,246,0.2)",
    glow: "rgba(59,130,246,0.06)",
    weight: 15,
    focus: ["Gross Margin Analysis", "Burn Rate & Runway", "Revenue Model"],
    stance: "Demands explicit COGS breakdown and a path to 65%+ gross margins within 18 months. Rejects models with multi-year CAC payback unless NRR is exceptional.",
    promptBio: "You are the CFO Advisor. You demand explicit unit economics, COGS breakdown, and a credible 24-month cash flow model before approving any business model.",
    sim: {
      tech:     { score: 76, note: "SaaS pricing achieves 70%+ gross margins at 500 customers.", niche: "B2B teams",          scope: "Freemium + Pro tiers",           budget: "$45K/month burn" },
      physical: { score: 48, note: "Hardware COGS eats 45-55% of revenue. Margins are very tight.", niche: "Premium buyers", scope: "Rent-to-own model",            budget: "High CAPEX upfront" },
    },
  },
  {
    role: "Legal Advisor",
    title: "Chief Legal Advisor",
    label: "Compliance & IP Risk",
    icon: Scale,
    accent: "#a8a8c0",
    border: "rgba(168,168,192,0.2)",
    glow: "rgba(168,168,192,0.06)",
    weight: 15,
    focus: ["GDPR / CCPA Compliance", "IP Ownership", "Regulatory Burden"],
    stance: "The board's risk governor. Never assumes compliance is manageable — always quantifies it. Flags any PII handling, biometric data, or IP ambiguity before product advances.",
    promptBio: "You are the Chief Legal Advisor. You prioritize GDPR, CCPA, IP ownership, and sector-specific regulatory compliance. You never greenlight a concept with unresolved legal exposure.",
    sim: {
      tech:     { score: 70, note: "SaaS telemetry requires GDPR DPA with all vendors.", niche: "EU/US businesses",    scope: "Privacy-first data model",         budget: "$8K legal counsel" },
      physical: { score: 60, note: "Hardware resale requires product liability insurance.", niche: "SMB buyers",        scope: "Terms of service + warranty docs", budget: "$12K legal setup" },
    },
  },
  {
    role: "Security Architect",
    title: "Security Architect",
    label: "Threat Models & Zero-Trust",
    icon: ShieldAlert,
    accent: "#ef4444",
    border: "rgba(239,68,68,0.2)",
    glow: "rgba(239,68,68,0.06)",
    weight: 15,
    focus: ["OWASP Top 10", "Auth Architecture", "Data Encryption"],
    stance: "Evaluates every system as if a nation-state attacker already has partial access. Demands OAuth 2.0 with PKCE, AES-256 encryption, immutable audit logs, and explicit threat models for all PII.",
    promptBio: "You are the Security Architect. You require zero-trust network design, OAuth 2.0/PKCE authentication, AES-256 encryption at rest, and immutable audit logs before any product launches.",
    sim: {
      tech:     { score: 65, note: "API endpoints need rate limiting and SSRF protection.", niche: "Security-conscious teams", scope: "Zero-trust + JWT rotation",    budget: "$8-15K pentest" },
      physical: { score: 72, note: "Hardware firmware requires secure boot and tamper detection.", niche: "Enterprise buyers", scope: "Secure firmware + OTA updates", budget: "$5K security audit" },
    },
  },
  {
    role: "UX Advisor",
    title: "UX & Design Systems Advisor",
    label: "Friction & Retention",
    icon: Palette,
    accent: "#06b6d4",
    border: "rgba(6,182,212,0.2)",
    glow: "rgba(6,182,212,0.06)",
    weight: 15,
    focus: ["Time-to-First-Value", "Onboarding Friction", "WCAG 2.1 Compliance"],
    stance: "Rejects any product with more than 3 onboarding steps before first value delivery. Champions the user when engineers and investors ignore them. Measures success in D30 retention, not feature count.",
    promptBio: "You are the UX Advisor. You demand time-to-first-value under 60 seconds, minimal onboarding friction, WCAG 2.1 AA accessibility, and a clear empty state design before launch.",
    sim: {
      tech:     { score: 82, note: "Digital onboarding can achieve <60s time-to-first-value.", niche: "Individual users",    scope: "Progressive onboarding flow",   budget: "$3K UX audit" },
      physical: { score: 70, note: "Unboxing UX is critical — premium packaging signals quality.", niche: "Premium buyers", scope: "Guided setup + warranty card",  budget: "$5K packaging design" },
    },
  },
  {
    role: "Competition Analyst",
    title: "Competitive Intelligence Analyst",
    label: "Market Positioning",
    icon: Compass,
    accent: "#84cc16",
    border: "rgba(132,204,22,0.2)",
    glow: "rgba(132,204,22,0.06)",
    weight: 15,
    focus: ["Competitor Mapping", "Porter's Five Forces", "Switching Cost Design"],
    stance: "Maps markets like a chess board. Hostile to 'we have no competitors' claims. Demands identification of 3 specific incumbents and a credible answer for why none can copy this product in 18 months.",
    promptBio: "You are the Competitive Intelligence Analyst. You apply Porter's Five Forces, identify specific incumbents, and assess whether the startup has a sustainable competitive advantage.",
    sim: {
      tech:     { score: 68, note: "3+ funded incumbents. PLG motion creates a practitioner moat.", niche: "Underserved practitioners", scope: "Blue ocean positioning",   budget: "$2K competitive intel" },
      physical: { score: 74, note: "Premium hardware niche has fewer direct competitors.",          niche: "Enthusiast communities",     scope: "Category differentiation", budget: "$1K market research" },
    },
  },
];

function ScoreMeter({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Sim Grade</span>
        <span style={{ fontSize: 11, fontWeight: 800, color }}>{value}%</span>
      </div>
      <div className="progress-bar-bg">
        <motion.div
          className="progress-bar-fill"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: [0.16,1,0.3,1] }}
          style={{ background: `linear-gradient(90deg, ${color}80, ${color})` }}
        />
      </div>
    </div>
  );
}

export default function AdvisorsPage() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [simInput, setSimInput] = useState("");
  const [simResult, setSimResult] = useState<"tech" | "physical" | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const runSim = () => {
    if (!simInput.trim()) return;
    setIsSimulating(true);
    setSimResult(null);
    setTimeout(() => {
      const isTech = ["software","app","ai","web","platform","saas","api"].some(k => simInput.toLowerCase().includes(k));
      setSimResult(isTech ? "tech" : "physical");
      setIsSimulating(false);
    }, 1400);
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ marginBottom: 36 }}>
        <div className="label-xs" style={{ marginBottom: 10 }}>FounderOS — Advisor Roster</div>
        <h1 className="heading-md" style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 10 }}>
          <Users size={22} style={{ color: "#9b6dff", filter: "drop-shadow(0 0 8px rgba(155,109,255,0.5))" }} />
          Executive Advisor Roster
        </h1>
        <p style={{ fontSize: 13, color: "rgba(168,168,192,0.6)", lineHeight: 1.5, maxWidth: 480 }}>
          Detailed profiles of each AI board member — their evaluation weights, decision heuristics, and system personas.
        </p>
      </motion.div>

      {/* ── Advisor Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14, marginBottom: 40 }}>
        {ADVISORS.map((adv, i) => {
          const Icon = adv.icon;
          const isOpen = expanded === adv.role;
          return (
            <motion.div
              key={adv.role}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="card"
              style={{ padding: 0, overflow: "hidden" }}
            >
              {/* Accent bar at top */}
              <div style={{ height: 3, background: `linear-gradient(90deg, ${adv.accent}, transparent)` }} />

              <div style={{ padding: "20px 20px 0" }}>
                {/* Profile header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12,
                      background: `${adv.accent}12`, border: `1px solid ${adv.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: `0 0 16px ${adv.glow}`,
                    }}>
                      <Icon size={18} style={{ color: adv.accent }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#f4f4ff", letterSpacing: "-0.01em" }}>{adv.role}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{adv.title}</div>
                    </div>
                  </div>
                  <div style={{
                    padding: "3px 10px", borderRadius: 9999,
                    background: `${adv.accent}10`, border: `1px solid ${adv.border}`,
                    fontSize: 10, fontWeight: 700, color: adv.accent,
                  }}>
                    {adv.weight}% weight
                  </div>
                </div>

                {/* Focus tags */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                  {adv.focus.map(f => (
                    <span key={f} style={{
                      fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 9999,
                      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                      color: "rgba(244,244,255,0.7)",
                    }}>{f}</span>
                  ))}
                </div>

                {/* Stance */}
                <p style={{ fontSize: 12, color: "rgba(168,168,192,0.7)", lineHeight: 1.65, marginBottom: 16 }}>
                  {adv.stance}
                </p>
              </div>

              {/* Expand toggle */}
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <button
                  onClick={() => setExpanded(isOpen ? null : adv.role)}
                  style={{
                    width: "100%", padding: "10px 20px",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: "transparent", border: "none", cursor: "pointer",
                    fontSize: 11, fontWeight: 600,
                    color: isOpen ? adv.accent : "rgba(255,255,255,0.3)",
                    transition: "color 0.15s ease",
                  }}
                >
                  <span>System Persona Spec</span>
                  {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      style={{ overflow: "hidden" }}
                    >
                      <div style={{
                        margin: "0 20px 20px",
                        padding: "14px 16px", borderRadius: 12,
                        background: "rgba(5,5,14,0.8)", border: "1px solid rgba(255,255,255,0.06)",
                        fontFamily: "JetBrains Mono, monospace", fontSize: 11,
                        color: "rgba(168,184,255,0.8)", lineHeight: 1.7,
                      }}>
                        <div style={{ marginBottom: 8, fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                          System Prompt
                        </div>
                        {adv.promptBio}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Stance Simulator ── */}
      <div className="card" style={{ padding: "28px 28px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
          <div>
            <div className="label-xs" style={{ marginBottom: 8 }}>Interactive Tool</div>
            <h3 className="heading-sm">Stance Simulator</h3>
            <p style={{ fontSize: 12, color: "rgba(168,168,192,0.6)", marginTop: 4, lineHeight: 1.5 }}>
              Preview how each advisor would react to your startup concept.
            </p>
          </div>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "4px 12px", borderRadius: 9999,
            background: "rgba(155,109,255,0.1)", border: "1px solid rgba(155,109,255,0.2)", color: "#9b6dff",
          }}>
            Heuristic Model
          </span>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <input
            className="input-field"
            style={{ flex: 1 }}
            placeholder="E.g. AI-powered contract management SaaS for enterprise legal teams…"
            value={simInput}
            onChange={e => setSimInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && runSim()}
            disabled={isSimulating}
          />
          <button
            className="btn btn-primary"
            onClick={runSim}
            disabled={isSimulating || !simInput.trim()}
            style={{ flexShrink: 0, height: 48, padding: "0 20px" }}
          >
            {isSimulating ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 1s linear infinite" }}>
                <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
              </svg>
            ) : (
              <><Sparkles size={14} /> Simulate</>
            )}
          </button>
        </div>

        <AnimatePresence>
          {simResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, marginTop: 20 }}
            >
              {ADVISORS.map((adv, i) => {
                const sim = adv.sim[simResult];
                const Icon = adv.icon;
                return (
                  <motion.div
                    key={adv.role}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.07 }}
                    style={{
                      padding: "16px", borderRadius: 14,
                      background: `${adv.accent}08`,
                      border: `1px solid ${adv.border}`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <Icon size={14} style={{ color: adv.accent }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: adv.accent }}>{adv.role}</span>
                    </div>
                    <ScoreMeter value={sim.score} color={adv.accent} />
                    <p style={{ fontSize: 11, color: "rgba(168,168,192,0.8)", lineHeight: 1.6, marginTop: 10, fontStyle: "italic" }}>
                      "{sim.note}"
                    </p>
                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                      {[
                        { k: "Niche", v: sim.niche },
                        { k: "Scope", v: sim.scope },
                        { k: "Budget", v: sim.budget },
                      ].map(row => (
                        <div key={row.k} style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
                          <span style={{ color: "rgba(255,255,255,0.25)", fontWeight: 600 }}>{row.k}</span>
                          <span style={{ color: "rgba(244,244,255,0.7)", fontWeight: 500, textAlign: "right", maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis" }}>{row.v}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
