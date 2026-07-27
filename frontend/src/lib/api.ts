import { useEffect, useState } from "react";

export interface Session {
  id: string;
  idea: string;
  active_agents: string[];
  state: string;
  turns: DebateTurn[];
  votes: Vote[];
  health_score: StartupHealthScore | null;
  synthesis: SynthesisResult | null;
  created_at: number;
  updated_at: number;
  domain?: string;
}

export interface DebateTurn {
  id: string;
  role: string;
  round: number;
  content: string;
  timestamp: number;
}

export interface CategoryEvaluationDetail {
  category: string;
  score: number;
  confidence: number;
  risk_level: string;
  reason: string;
}

export interface Vote {
  role: string;
  vote: "APPROVE" | "CONDITIONALLY_APPROVE" | "REJECT";
  confidence: number;
  category_evaluations?: Record<string, number>;
  category_details?: CategoryEvaluationDetail[];
  reasoning: string;
  blocking_concern?: string | null;
  critical_assumption?: string;
  biggest_concern?: string;
}

export interface StartupHealthScore {
  overall_score: number;
  approval_ratio: number;
  average_confidence: number;
  category_scores?: Record<string, number>;
  score_explanations?: Record<string, string>;
  agent_votes: Record<string, string>;
  explainable_scores?: Record<string, CategoryEvaluationDetail>;
  penalties?: any[];
  consensus_level?: string;
  vote_distribution?: Record<string, number>;
}

export interface SynthesisResult {
  executive_summary: string;
  architecture: string;
  investment_memo: string;
  roadmap: string[];
  go_to_market: string;
  financial_report: string;
  compliance_checklist: string[];
  security_assessment: string;
  ux_review: string;
  competitive_landscape: string;
  risks?: string[];
  executive_summary_v2?: {
    vision: string;
    strategic_moat: string;
    capital_efficiency: string;
    overall_verdict: string;
  };
  risk_matrix?: {
    level: string;
    risk: string;
    mitigation: string;
  }[];
  opportunity_matrix?: {
    horizon: string;
    opportunity: string;
    value: string;
  }[];
  action_plan?: {
    phase: string;
    priority: string;
    milestone: string;
  }[];
}

export function getApiBase() {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined" && window.location.hostname) {
    return `http://${window.location.hostname}:8000`;
  }
  return "http://localhost:8000";
}

export const API_BASE = getApiBase();

export async function createSession(idea: string, activeAgents?: string[]): Promise<Session> {
  const res = await fetch(`${getApiBase()}/api/board/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      idea,
      active_agents: activeAgents,
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to create boardroom session: ${res.statusText}`);
  }
  return res.json();
}

export async function getSession(sessionId: string): Promise<Session> {
  const res = await fetch(`${getApiBase()}/api/board/session/${sessionId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch boardroom session: ${res.statusText}`);
  }
  return res.json();
}

export async function listSessions(): Promise<Session[]> {
  const res = await fetch(`${getApiBase()}/api/board/sessions`);
  if (!res.ok) {
    throw new Error(`Failed to list boardroom sessions: ${res.statusText}`);
  }
  return res.json();
}

export function useBoardroomStream(sessionId: string | undefined, onComplete?: () => void) {
  const [turns, setTurns] = useState<DebateTurn[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [healthScore, setHealthScore] = useState<StartupHealthScore | null>(null);
  const [synthesis, setSynthesis] = useState<SynthesisResult | null>(null);
  const [status, setStatus] = useState<string>("Awaiting board connections...");
  const [sessionState, setSessionState] = useState<string>("INITIALIZED");
  const [activeAgents, setActiveAgents] = useState<string[]>([]);
  const [advisorStates, setAdvisorStates] = useState<Record<string, { state: string; details: string }>>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load initial session state
  useEffect(() => {
    if (!sessionId) return;
    getSession(sessionId)
      .then((session) => {
        setActiveAgents(session.active_agents);
        const initialStates: Record<string, { state: string; details: string }> = {};
        session.active_agents.forEach((role) => {
          initialStates[role] = {
            state: session.state === "COMPLETED" ? "COMPLETED" : "WAITING",
            details: session.state === "COMPLETED" ? "Session adjourned." : "Conjoined. Awaiting session start..."
          };
        });

        session.turns.forEach((t) => {
          initialStates[t.role] = { state: "REVIEWING", details: "Reviewing boardroom comments..." };
        });

        if (session.state === "COMPLETED") {
          session.active_agents.forEach((role) => {
            initialStates[role] = { state: "COMPLETED", details: "Report compiled successfully." };
          });
        }
        setAdvisorStates(initialStates);
        setTurns(session.turns);
        setVotes(session.votes);
        setHealthScore(session.health_score);
        setSynthesis(session.synthesis);
        setSessionState(session.state);
        setStatus(session.state === "COMPLETED" ? "Board meeting adjourned." : "Ready.");
      })
      .catch((err) => {
        console.error("Failed to load initial session info:", err);
        setError(err.message || "Session not found. It may have been cleared during a backend server restart.");
      })
      .finally(() => {
        setIsLoaded(true);
      });
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || !isLoaded) return;

    // Do not reconnect if session is already complete or failed
    if (sessionState === "COMPLETED" || sessionState === "FAILED") return;

    // Open connection to FastAPI SSE endpoint
    const url = `${getApiBase()}/api/board/session/${sessionId}/stream`;
    const eventSource = new EventSource(url);

    eventSource.addEventListener("status", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setStatus(data.message);
        setSessionState(data.state);
        if (data.state === "FAILED") {
          setError(data.message || "Session process failed.");
          eventSource.close();
        }
      } catch (err) {
        console.error("Failed to parse status event data", err);
      }
    });

    eventSource.addEventListener("advisor_status", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setAdvisorStates((prev) => ({
          ...prev,
          [data.role]: { state: data.state, details: data.details }
        }));
      } catch (err) {
        console.error("Failed to parse advisor_status event data", err);
      }
    });

    eventSource.addEventListener("turn", (e: MessageEvent) => {
      try {
        const data: DebateTurn = JSON.parse(e.data);
        setTurns((prev) => {
          if (prev.some((t) => t.id === data.id)) return prev;
          return [...prev, data];
        });
      } catch (err) {
        console.error("Failed to parse turn event data", err);
      }
    });

    eventSource.addEventListener("vote", (e: MessageEvent) => {
      try {
        const data: Vote = JSON.parse(e.data);
        setVotes((prev) => {
          if (prev.some((v) => v.role === data.role)) return prev;
          return [...prev, data];
        });
      } catch (err) {
        console.error("Failed to parse vote event data", err);
      }
    });

    eventSource.addEventListener("health_score", (e: MessageEvent) => {
      try {
        const data: StartupHealthScore = JSON.parse(e.data);
        setHealthScore(data);
      } catch (err) {
        console.error("Failed to parse health_score event data", err);
      }
    });

    eventSource.addEventListener("synthesis", (e: MessageEvent) => {
      try {
        const data: SynthesisResult = JSON.parse(e.data);
        setSynthesis(data);
        setSessionState("COMPLETED");
        setStatus("Board meeting adjourned.");
        if (onComplete) onComplete();
        eventSource.close();
      } catch (err) {
        console.error("Failed to parse synthesis event data", err);
      }
    });

    eventSource.onerror = () => {
      // EventSource automatically retries on error unless closed
      setError("Board connection interrupted. Retrying...");
    };

    return () => {
      eventSource.close();
    };
  }, [sessionId, isLoaded]);

  return {
    turns,
    votes,
    healthScore,
    synthesis,
    status,
    sessionState,
    activeAgents,
    advisorStates,
    error,
    setTurns,
    setVotes,
    setHealthScore,
    setSynthesis,
    setSessionState,
    setStatus,
    setError
  };
}
