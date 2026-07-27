from fastapi import FastAPI, Depends, HTTPException, Query, BackgroundTasks, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from typing import List, Optional
import json
import logging
import asyncio
import time

from .config import settings
from .schemas.session import BoardroomSession, Role, SessionState, StartupHealthScore, VoteOption
from .database.repository import SessionRepository
from .database.sqlite_db import SQLiteSessionRepository
from .core.board import BoardOrchestrator
from pydantic import BaseModel, Field

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.project_name,
    version="1.0.0",
    description="FounderOS Multi-Agent Executive Boardroom API"
)

# Enable CORS for Next.js frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Repository singleton injection provider
_repository_singleton = SQLiteSessionRepository()

def get_repository() -> SessionRepository:
    return _repository_singleton

class CreateSessionRequest(BaseModel):
    idea: str = Field(..., min_length=10, description="The business concept/idea to discuss")
    active_agents: Optional[List[Role]] = Field(
        default=None,
        description="List of active roles. Defaults to CEO, CTO, Investor, and Product Manager."
    )

@app.get("/")
async def root():
    return {
        "status": "online",
        "project": settings.project_name,
        "environment": settings.environment,
        "api_key_configured": bool(settings.get_api_key)
    }

@app.post("/api/board/session", response_model=BoardroomSession)
async def create_session(
    request: CreateSessionRequest,
    repo: SessionRepository = Depends(get_repository)
):
    """
    Scaffolds a new session entry. The client can then call /stream to run it.
    """
    # Default to all 10 agents
    roles = request.active_agents
    if not roles:
        roles = [
            Role.CEO, Role.CTO, Role.INVESTOR, Role.PRODUCT_MANAGER,
            Role.MARKETING, Role.LEGAL, Role.FINANCE, Role.SECURITY,
            Role.UX, Role.COMPETITION
        ]

    import uuid
    import time
    session = BoardroomSession(
        id=str(uuid.uuid4()),
        idea=request.idea,
        active_agents=roles,
        state=SessionState.INITIALIZED,
        created_at=time.time(),
        updated_at=time.time()
    )
    await repo.save_session(session)
    return session

@app.get("/api/board/session/{session_id}/stream")
async def stream_session(
    session_id: str,
    request: Request,
    repo: SessionRepository = Depends(get_repository)
):
    """
    Streams the live executive board debate step-by-step using Server-Sent Events (SSE).
    """
    session = await repo.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    orchestrator = BoardOrchestrator(repository=repo, api_key=settings.get_api_key)

    async def event_generator():
        try:
            async for event in orchestrator.run_session(session_id, session.idea, session.active_agents):
                if await request.is_disconnected():
                    logger.info(f"Client disconnected for session {session_id}")
                    break
                # Standard SSE format: "event: [name]\ndata: [json]\n\n"
                yield f"event: {event['event']}\ndata: {json.dumps(event['data'])}\n\n"
        except (asyncio.CancelledError, ConnectionResetError, BrokenPipeError, OSError):
            logger.info(f"Client stream closed for session {session_id}")
        except Exception as e:
            logger.error(f"Stream error for session {session_id}: {e}")
            if not await request.is_disconnected():
                try:
                    yield f"event: status\ndata: {json.dumps({'session_id': session_id, 'state': SessionState.FAILED, 'message': f'Error: {str(e)}'})}\n\n"
                except Exception:
                    pass

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.get("/api/board/session/{session_id}", response_model=BoardroomSession)
async def get_session(
    session_id: str,
    repo: SessionRepository = Depends(get_repository)
):
    """
    Retrieves the complete state of a boardroom session.
    """
    session = await repo.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@app.get("/api/board/sessions", response_model=List[BoardroomSession])
async def list_sessions(
    repo: SessionRepository = Depends(get_repository)
):
    """
    Lists all past boardroom sessions.
    """
    return await repo.list_sessions()

@app.delete("/api/board/session/{session_id}")
async def delete_session(
    session_id: str,
    repo: SessionRepository = Depends(get_repository)
):
    """
    Deletes a session record.
    """
    success = await repo.delete_session(session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "success", "message": f"Session {session_id} deleted."}

@app.get("/api/board/session/{session_id}/export/json")
async def export_json(
    session_id: str,
    repo: SessionRepository = Depends(get_repository)
):
    session = await repo.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    import json
    content = json.dumps(session.model_dump(), indent=2)
    filename = f"founder_os_{session_id[:8]}.json"
    return Response(
        content=content,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@app.get("/api/board/session/{session_id}/export/markdown")
async def export_markdown(
    session_id: str,
    repo: SessionRepository = Depends(get_repository)
):
    session = await repo.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    import time
    md = []
    md.append(f"# FounderOS Executive Boardroom Report\n")
    md.append(f"**Startup Concept:** {session.idea}")
    md.append(f"**Session ID:** `{session.id}`")
    md.append(f"**Detected Domain:** {session.domain or 'SaaS'}")
    md.append(f"**Date Compiled:** {time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime(session.created_at))} UTC\n")
    md.append(f"---\n")

    if session.health_score:
        hs = session.health_score
        md.append(f"## Startup Viability Summary")
        md.append(f"- **Overall Viability Score:** {hs.overall_score}/100")
        md.append(f"- **Board Approval Ratio:** {hs.approval_ratio * 100:.0f}%")
        md.append(f"- **Average Advisor Confidence:** {hs.average_confidence:.1f}%\n")
        
        md.append(f"### Category Evaluations")
        for cat, score in hs.category_scores.items():
            md.append(f"- **{cat}:** {score}/100")
        md.append("\n")

        md.append(f"### Board Voting Registry")
        md.append(f"| Advisor Role | Vote | Confidence | Critical Assumption | Biggest Concern |")
        md.append(f"| --- | --- | --- | --- | --- |")
        for v in session.votes:
            md.append(f"| {v.role.value} | {v.vote.value} | {v.confidence}% | {v.critical_assumption} | {v.biggest_concern} |")
        md.append("\n")
        
    md.append(f"## Board Debate Transcript\n")
    for turn in session.turns:
        md.append(f"### {turn.role.value} (Round {turn.round})")
        md.append(f"{turn.content}\n")

    if session.synthesis:
        syn = session.synthesis
        md.append(f"## Synthesized Action Plan & Deliverables\n")
        md.append(f"### Executive Summary\n{syn.executive_summary}\n")
        md.append(f"### System Architecture & Tech Stack\n{syn.architecture}\n")
        md.append(f"### Investment Memo\n{syn.investment_memo}\n")
        
        md.append(f"### MVP Execution Roadmap")
        for line in syn.roadmap:
            md.append(f"- {line}")
        md.append("\n")
        
        md.append(f"### Go-To-Market Strategy\n{syn.go_to_market}\n")
        md.append(f"### Financial Forecast\n{syn.financial_report}\n")
        
        md.append(f"### Compliance Checklist")
        for line in syn.compliance_checklist:
            md.append(f"- {line}")
        md.append("\n")
        
        md.append(f"### Security Risk Assessment\n{syn.security_assessment}\n")
        md.append(f"### User Experience Friction Review\n{syn.ux_review}\n")
        md.append(f"### Competitive Landscape\n{syn.competitive_landscape}\n")

    content = "\n".join(md)
    filename = f"founder_os_{session_id[:8]}.md"
    return Response(
        content=content,
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@app.get("/api/board/session/{session_id}/export/html")
async def export_html(
    session_id: str,
    repo: SessionRepository = Depends(get_repository)
):
    session = await repo.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    import time
    
    # Styled HTML layout
    html = []
    html.append("<!DOCTYPE html>")
    html.append('<html lang="en">')
    html.append("<head>")
    html.append('    <meta charset="UTF-8">')
    html.append(f"    <title>FounderOS Executive Report - {session_id[:8]}</title>")
    html.append('    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono&display=swap" rel="stylesheet">')
    html.append("    <style>")
    html.append("        body {")
    html.append("            background-color: #0b0b0f;")
    html.append("            color: #e2e8f0;")
    html.append("            font-family: 'Inter', system-ui, -apple-system, sans-serif;")
    html.append("            margin: 0;")
    html.append("            padding: 40px 24px;")
    html.append("            line-height: 1.6;")
    html.append("        }")
    html.append("        .container {")
    html.append("            max-width: 900px;")
    html.append("            margin: 0 auto;")
    html.append("        }")
    html.append("        .header {")
    html.append("            border-bottom: 2px solid #4d5fff;")
    html.append("            padding-bottom: 20px;")
    html.append("            margin-bottom: 32px;")
    html.append("        }")
    html.append("        .header h1 {")
    html.append("            margin: 0 0 10px 0;")
    html.append("            color: #ffffff;")
    html.append("            font-size: 2.2rem;")
    html.append("            font-weight: 800;")
    html.append("            letter-spacing: -0.02em;")
    html.append("        }")
    html.append("        .meta-grid {")
    html.append("            display: grid;")
    html.append("            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));")
    html.append("            gap: 16px;")
    html.append("            font-size: 13px;")
    html.append("            color: #94a3b8;")
    html.append("            margin-top: 16px;")
    html.append("        }")
    html.append("        .meta-item strong {")
    html.append("            color: #ffffff;")
    html.append("        }")
    html.append("        h2 {")
    html.append("            color: #a8b8ff;")
    html.append("            font-size: 1.6rem;")
    html.append("            margin-top: 48px;")
    html.append("            border-bottom: 1px solid rgba(255,255,255,0.08);")
    html.append("            padding-bottom: 8px;")
    html.append("            font-weight: 700;")
    html.append("        }")
    html.append("        h3 {")
    html.append("            color: #e2e8f0;")
    html.append("            font-size: 1.2rem;")
    html.append("            margin-top: 24px;")
    html.append("        }")
    html.append("        .score-card {")
    html.append("            background: rgba(77, 95, 255, 0.05);")
    html.append("            border: 1px solid rgba(77, 95, 255, 0.15);")
    html.append("            border-radius: 12px;")
    html.append("            padding: 20px;")
    html.append("            margin-bottom: 32px;")
    html.append("        }")
    html.append("        .score-val {")
    html.append("            font-size: 3rem;")
    html.append("            font-weight: 800;")
    html.append("            color: #10b981;")
    html.append("            line-height: 1;")
    html.append("            margin-bottom: 8px;")
    html.append("        }")
    html.append("        table {")
    html.append("            width: 100%;")
    html.append("            border-collapse: collapse;")
    html.append("            margin: 20px 0;")
    html.append("            font-size: 13px;")
    html.append("        }")
    html.append("        th, td {")
    html.append("            padding: 10px 12px;")
    html.append("            text-align: left;")
    html.append("            border-bottom: 1px solid rgba(255,255,255,0.05);")
    html.append("        }")
    html.append("        th {")
    html.append("            background: rgba(255,255,255,0.02);")
    html.append("            color: #94a3b8;")
    html.append("            font-weight: 600;")
    html.append("        }")
    html.append("        .turn-card {")
    html.append("            background: rgba(255,255,255,0.02);")
    html.append("            border: 1px solid rgba(255,255,255,0.05);")
    html.append("            border-radius: 8px;")
    html.append("            padding: 16px;")
    html.append("            margin-bottom: 16px;")
    html.append("        }")
    html.append("        .turn-header {")
    html.append("            font-weight: 600;")
    html.append("            color: #a8b8ff;")
    html.append("            margin-bottom: 8px;")
    html.append("            font-size: 13px;")
    html.append("        }")
    html.append("        .turn-body {")
    html.append("            font-size: 13.5px;")
    html.append("            color: #cbd5e1;")
    html.append("            white-space: pre-wrap;")
    html.append("        }")
    html.append("        @media print {")
    html.append("            body {")
    html.append("                background: #ffffff;")
    html.append("                color: #111111;")
    html.append("                padding: 0;")
    html.append("            }")
    html.append("            .header h1, h2, h3, th {")
    html.append("                color: #000000 !important;")
    html.append("            }")
    html.append("            .header {")
    html.append("                border-bottom: 2px solid #000000;")
    html.append("            }")
    html.append("            h2 {")
    html.append("                border-bottom: 1px solid #000000;")
    html.append("                page-break-before: always;")
    html.append("            }")
    html.append("            .score-card, .turn-card {")
    html.append("                background: none;")
    html.append("                border: 1px solid #cccccc;")
    html.append("            }")
    html.append("            .score-val {")
    html.append("                color: #000000 !important;")
    html.append("            }")
    html.append("            .turn-body {")
    html.append("                color: #333333;")
    html.append("            }")
    html.append("        }")
    html.append("    </style>")
    html.append("</head>")
    html.append("<body>")
    html.append('    <div class="container">')
    html.append('        <div class="header">')
    html.append(f"            <h1>FounderOS Boardroom Simulation</h1>")
    html.append(f"            <p style='margin: 0; font-size: 15px; color: #cbd5e1;'><strong>Concept:</strong> {session.idea}</p>")
    html.append('            <div class="meta-grid">')
    html.append(f'                <div class="meta-item"><strong>Session ID:</strong> {session.id}</div>')
    html.append(f'                <div class="meta-item"><strong>Domain:</strong> {session.domain or "SaaS"}</div>')
    html.append(f'                <div class="meta-item"><strong>Date:</strong> {time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime(session.created_at))} UTC</div>')
    html.append("            </div>")
    html.append("        </div>")

    if session.health_score:
        hs = session.health_score
        html.append('        <div class="score-card">')
        html.append(f'            <div class="score-val">{hs.overall_score}/100</div>')
        html.append(f"            <p style='margin: 0; font-weight: 500;'>Overall Health Score (Approval Ratio: {hs.approval_ratio * 100:.0f}%, Avg Confidence: {hs.average_confidence:.1f}%)</p>")
        html.append("        </div>")

        html.append("        <h2>Category Breakdown</h2>")
        html.append("        <table>")
        html.append("            <thead>")
        html.append("                <tr><th>Category</th><th>Score</th></tr>")
        html.append("            </thead>")
        html.append("            <tbody>")
        for cat, val in hs.category_scores.items():
            html.append(f"                <tr><td><strong>{cat}</strong></td><td>{val}/100</td></tr>")
        html.append("            </tbody>")
        html.append("        </table>")

        html.append("        <h2>Advisor Votes</h2>")
        html.append("        <table>")
        html.append("            <thead>")
        html.append("                <tr><th>Advisor</th><th>Vote</th><th>Confidence</th><th>Critical Assumption</th><th>Biggest Concern</th></tr>")
        html.append("            </thead>")
        html.append("            <tbody>")
        for v in session.votes:
            html.append(f"                <tr>")
            html.append(f"                    <td><strong>{v.role.value}</strong></td>")
            html.append(f"                    <td>{v.vote.value}</td>")
            html.append(f"                    <td>{v.confidence}%</td>")
            html.append(f"                    <td>{v.critical_assumption}</td>")
            html.append(f"                    <td>{v.biggest_concern}</td>")
            html.append(f"                </tr>")
        html.append("            </tbody>")
        html.append("        </table>")

    html.append("        <h2>Executive Debate Transcripts</h2>")
    for turn in session.turns:
        html.append('        <div class="turn-card">')
        html.append(f'            <div class="turn-header">{turn.role.value} &mdash; Round {turn.round}</div>')
        html.append(f'            <div class="turn-body">{turn.content}</div>')
        html.append("        </div>")

    if session.synthesis:
        syn = session.synthesis
        html.append("        <h2>Synthesized Strategic Deliverables</h2>")
        html.append("        <h3>Executive Summary</h3>")
        html.append(f"        <div style='white-space: pre-wrap;'>{syn.executive_summary}</div>")
        
        html.append("        <h3>Technical Architecture & Stack</h3>")
        html.append(f"        <div style='white-space: pre-wrap;'>{syn.architecture}</div>")
        
        html.append("        <h3>Investment Memo</h3>")
        html.append(f"        <div style='white-space: pre-wrap;'>{syn.investment_memo}</div>")
        
        html.append("        <h3>MVP Execution Roadmap</h3>")
        html.append("        <ul>")
        for line in syn.roadmap:
            html.append(f"            <li>{line}</li>")
        html.append("        </ul>")

        html.append("        <h3>Go-To-Market Strategy</h3>")
        html.append(f"        <div style='white-space: pre-wrap;'>{syn.go_to_market}</div>")
        
        html.append("        <h3>Financial Forecast</h3>")
        html.append(f"        <div style='white-space: pre-wrap;'>{syn.financial_report}</div>")

        html.append("        <h3>Compliance Checklist</h3>")
        html.append("        <ul>")
        for line in syn.compliance_checklist:
            html.append(f"            <li>{line}</li>")
        html.append("        </ul>")

        html.append("        <h3>Security Risk Assessment</h3>")
        html.append(f"        <div style='white-space: pre-wrap;'>{syn.security_assessment}</div>")
        
        html.append("        <h3>UX Review</h3>")
        html.append(f"        <div style='white-space: pre-wrap;'>{syn.ux_review}</div>")
        
        html.append("        <h3>Competitive Landscape</h3>")
        html.append(f"        <div style='white-space: pre-wrap;'>{syn.competitive_landscape}</div>")

    html.append("    </div>")
    html.append("</body>")
    html.append("</html>")

    content = "\n".join(html)
    filename = f"founder_os_{session_id[:8]}.html"
    return Response(
        content=content,
        media_type="text/html",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

class RecalculateSandboxRequest(BaseModel):
    market_opp_modifier: float = Field(1.0, description="Multiplier for Market Opportunity score (e.g. 0.5 to 1.5)")
    tech_feas_modifier: float = Field(1.0, description="Multiplier for Technical Feasibility score")
    fin_viab_modifier: float = Field(1.0, description="Multiplier for Financial Viability score")
    exec_read_modifier: float = Field(1.0, description="Multiplier for Execution Readiness score")
    comp_adv_modifier: float = Field(1.0, description="Multiplier for Competitive Advantage score")
    risk_modifier: float = Field(1.0, description="Multiplier for Risk score")
    penalty_override: Optional[int] = Field(None, description="Override for penalty deduction")

@app.post("/api/board/session/{session_id}/recalculate", response_model=BoardroomSession)
async def recalculate_session(
    session_id: str,
    request: RecalculateSandboxRequest,
    repo: SessionRepository = Depends(get_repository)
):
    session = await repo.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if not session.health_score:
        raise HTTPException(status_code=400, detail="Session has not been evaluated yet")

    # Get weights and domain
    domain = session.domain or "SaaS"
    orchestrator = BoardOrchestrator(repository=repo, api_key=settings.get_api_key)
    weights = orchestrator._get_advisor_weights(domain)

    # Perform recalculation
    votes = session.votes
    
    # Retrieve configurable advisor weights
    weights_config = settings.advisor_weights
    weights_dict = {}
    for r in Role:
        wt = weights_config.get(r.value)
        if wt is None:
            wt = weights.get(r, 0.10) if weights else 0.10
        weights_dict[r] = wt

    approved_count = 0
    total_confidence = 0.0
    agent_votes = {}

    for v in votes:
        total_confidence += v.confidence
        agent_votes[v.role] = v.vote
        if v.vote in (VoteOption.APPROVE, VoteOption.CONDITIONALLY_APPROVE):
            approved_count += 1

    categories = ["Market Opportunity", "Technical Feasibility", "Financial Viability", "Execution Readiness", "Competitive Advantage", "Risk"]
    cat_weights = {
        "Market Opportunity": 0.20,
        "Technical Feasibility": 0.20,
        "Financial Viability": 0.20,
        "Execution Readiness": 0.15,
        "Competitive Advantage": 0.15,
        "Risk": 0.10
    }
    
    category_scores = {}
    score_explanations = {}
    
    for cat in categories:
        weighted_sum = 0.0
        weight_sum = 0.0
        contribs = []
        for v in votes:
            val = v.category_evaluations.get(cat)
            if val is not None:
                w = weights_dict.get(v.role, 0.10)
                weighted_sum += w * val
                weight_sum += w
                contribs.append(f"{v.role.value} ({val} * {w*100:.0f}% weight)")
        
        base_val = 60
        if weight_sum > 0:
            base_val = round(weighted_sum / weight_sum)
            
        # Apply sandbox modifiers
        mod = 1.0
        if cat == "Market Opportunity": mod = request.market_opp_modifier
        elif cat == "Technical Feasibility": mod = request.tech_feas_modifier
        elif cat == "Financial Viability": mod = request.fin_viab_modifier
        elif cat == "Execution Readiness": mod = request.exec_read_modifier
        elif cat == "Competitive Advantage": mod = request.comp_adv_modifier
        elif cat == "Risk": mod = request.risk_modifier
        
        category_scores[cat] = min(100, max(0, round(base_val * mod)))
        score_explanations[cat] = f"Recalculated in Sandbox with modifier {mod:.2f}."

    # Penalties
    applied_penalties = []
    applied_reasons = set()

    for v in votes:
        for p in getattr(v, "penalties", []):
            reason = p.reason
            norm = reason.lower().strip()
            if norm not in applied_reasons:
                applied_reasons.add(norm)
                applied_penalties.append({"reason": reason, "points": p.points})

    total_penalties = sum(p["points"] for p in applied_penalties)
    if request.penalty_override is not None:
        total_penalties = request.penalty_override

    # Consensus Engine
    consensus_adj = 0.0
    vote_options = [v.vote for v in votes]
    if vote_options:
        if all(o == VoteOption.APPROVE for o in vote_options):
            consensus_adj += 5.0
        elif all(o == VoteOption.REJECT for o in vote_options):
            consensus_adj -= 5.0
        elif VoteOption.APPROVE in vote_options and VoteOption.REJECT in vote_options:
            consensus_adj -= 5.0

        avg_conf = sum(v.confidence for v in votes) / len(votes)
        if avg_conf >= 80:
            consensus_adj += 2.0
        elif avg_conf < 50:
            consensus_adj -= 2.0

    weighted_cat_sum = sum(category_scores[cat] * cat_weights[cat] for cat in categories)
    raw_score = weighted_cat_sum - total_penalties + consensus_adj
    overall_score = round(max(0.0, min(100.0, raw_score)))

    approval_ratio = round(approved_count / len(votes), 2) if votes else 0.0
    average_confidence = round(total_confidence / len(votes), 1) if votes else 0.0

    # Build new StartupHealthScore object
    session.health_score = StartupHealthScore(
        overall_score=overall_score,
        approval_ratio=approval_ratio,
        average_confidence=average_confidence,
        category_scores=category_scores,
        score_explanations=score_explanations,
        agent_votes={v.role.value: v.vote.value for v in votes},
        explainable_scores={},
        penalties=applied_penalties,
        consensus_level="High Consensus" if abs(consensus_adj) >= 2 else "Split Board",
        vote_distribution={
            "Approve": sum(1 for o in vote_options if o == VoteOption.APPROVE),
            "Conditional": sum(1 for o in vote_options if o == VoteOption.CONDITIONALLY_APPROVE),
            "Reject": sum(1 for o in vote_options if o == VoteOption.REJECT),
        }
    )
    
    session.updated_at = time.time()
    await repo.save_session(session)
    return session

class AdvisorChatRequest(BaseModel):
    role: str = Field(..., description="The role of the advisor to chat with")
    message: str = Field(..., min_length=2, description="The user's follow-up message/question")

@app.post("/api/board/session/{session_id}/chat")
async def chat_with_advisor(
    session_id: str,
    request: AdvisorChatRequest,
    repo: SessionRepository = Depends(get_repository)
):
    session = await repo.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Find the advisor's role
    role_match = None
    for r in Role:
        if r.value.lower() == request.role.lower():
            role_match = r
            break
    if not role_match:
        raise HTTPException(status_code=400, detail="Invalid advisor role")

    # Search for this advisor's vote in session
    advisor_vote = None
    for v in session.votes:
        if v.role == role_match:
            advisor_vote = v
            break

    # Persona retrieval
    from .core.personas import AGENT_PERSONAS
    persona = AGENT_PERSONAS.get(role_match, f"You are the {role_match.value} on the board.")

    # Call Gemini if client is configured
    client = None
    if settings.get_api_key:
        from google import genai
        try:
            client = genai.Client(api_key=settings.get_api_key)
        except Exception as e:
            logger.error(f"Failed to init Gemini in chat: {e}")

    if client and not settings.offline_demo:
        try:
            vote_context = ""
            if advisor_vote:
                vote_context = (
                    f"You cast a vote of {advisor_vote.vote.value} with reasoning: '{advisor_vote.reasoning}' "
                    f"and biggest concern: '{advisor_vote.biggest_concern}'."
                )
            
            system_instruction = (
                f"{persona}\n\n"
                f"You are the {role_match.value} advisor on the board. {vote_context}\n"
                f"You must respond to a direct follow-up question from the founder.\n"
                f"RULES:\n"
                f"1. Stay strictly inside your expert role and persona.\n"
                f"2. Keep your response direct, professional, conversational, and under 80 words.\n"
                f"3. Do NOT use markdown section headers or bulleted lists."
            )
            
            prompt = (
                f"Startup Idea: {session.idea}\n"
                f"Founder's Question: {request.message}\n\n"
                f"Write your response:"
            )
            
            import anyio
            from google.genai import types
            response = await anyio.to_thread.run_sync(
                lambda: client.models.generate_content(
                    model=settings.gemini_model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        temperature=0.7,
                    )
                )
            )
            if response.text:
                return {"role": role_match.value, "message": response.text.strip()}
        except Exception as e:
            logger.error(f"Error calling Gemini in advisor chat: {e}")

    # Fallback to realistic mock response if rate-limited or offline
    from .core.agent import BoardAgent
    agent = BoardAgent(role_match)
    kw1, kw2 = agent._get_startup_keywords(session.idea)
    
    responses = {
        Role.CEO: f"As CEO, my focus is scaling {kw1}. We must validate market demand with a 10-customer pilot before expanding sales.",
        Role.CTO: f"Technically speaking, building {kw2} requires a robust caching layer. We cannot afford database latency spikes at launch.",
        Role.INVESTOR: f"As an investor, I need to see your CAC payback period. Low switching moats make PDF wrappers hard to back.",
        Role.PRODUCT_MANAGER: f"My recommendation is pruning the MVP scope of {kw1}. Launch a single dashboard view first to get user telemetry.",
        Role.MARKETING: f"We must establish a developer-centric beachhead segment for {kw1} before targeting mass enterprise channels.",
        Role.LEGAL: f"The legal barrier here is compliance. We need clear Terms of Service and data processing agreements in place.",
        Role.FINANCE: f"Our main financial risk is high infrastructure cost. We must cache API calls to protect gross margins.",
        Role.SECURITY: f"From a security perspective, we need zero-trust access controls on the data pipeline to prevent breaches.",
        Role.UX: f"We must simplify the onboarding user flow. Any registration friction will destroy early retention metrics.",
        Role.COMPETITION: f"Our competitors are moving fast. We need to define a custom proprietary workflow database layer to defend ourselves."
    }
    
    fallback_text = responses.get(role_match, f"As the {role_match.value}, we must ensure we align on execution milestones and manage risk.")
    return {"role": role_match.value, "message": fallback_text}

class PitchDrillRequest(BaseModel):
    role: str = Field(..., description="The role of the advisor asking the question")
    question: str = Field(..., description="The question being asked")
    answer: str = Field(..., description="The founder's answer")
    current_confidence: int = Field(..., ge=0, le=100, description="The current confidence score")

class PitchDrillResponse(BaseModel):
    role: str
    reaction: str = Field(..., description="Advisor's reaction to the answer")
    confidence_change: int = Field(..., description="Change in confidence")
    new_confidence: int = Field(..., description="The updated confidence score")
    next_role: Optional[str] = Field(None, description="The role of the next advisor to ask a question")
    next_question: Optional[str] = Field(None, description="The next question")

DRILL_QUESTIONS = {
    "CEO": "What is your ultimate 5-year vision for this company? Are we building a lifestyle business or a venture-scale unicorn?",
    "CTO": "What is the single biggest technical bottleneck or scaling bottleneck you expect to face in the next 6 months?",
    "Investor": "What is your unique competitive moat? What stops a well-funded competitor from cloning this database overnight?",
    "Product Manager": "What does your early MVP look like? What is the single core feature we are launching to validate user engagement?",
    "Marketing Strategist": "What is your low-cost customer acquisition strategy to get your first 100 active users?",
    "Legal Advisor": "How do you plan to navigate compliance and data privacy regulations in your target markets?",
    "Finance Advisor": "How do you plan to achieve unit economic profitability? What are your expected gross margins?",
    "Security Architect": "If a security breach occurred on your data pipeline, what is your mitigation protocol to protect user privacy?",
    "UX Advisor": "How are you minimizing user friction during the onboarding flow to prevent early churn?",
    "Competition Analyst": "Why are existing alternatives failing? Why is now the perfect time to build this?"
}

@app.post("/api/board/session/{session_id}/drill/evaluate", response_model=PitchDrillResponse)
async def evaluate_pitch(
    session_id: str,
    request: PitchDrillRequest,
    repo: SessionRepository = Depends(get_repository)
):
    session = await repo.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Find the matching Role enum
    role_match = None
    for r in Role:
        if r.value.lower() == request.role.lower():
            role_match = r
            break
    if not role_match:
        raise HTTPException(status_code=400, detail="Invalid advisor role")

    # Call Gemini if client is configured
    client = None
    if settings.get_api_key:
        from google import genai
        try:
            client = genai.Client(api_key=settings.get_api_key)
        except Exception as e:
            logger.error(f"Failed to init Gemini in drill: {e}")

    reaction = ""
    change = 0

    if client and not settings.offline_demo:
        try:
            from .core.personas import AGENT_PERSONAS
            persona = AGENT_PERSONAS.get(role_match, f"You are the {role_match.value} on the board.")
            
            system_instruction = (
                f"{persona}\n\n"
                f"You are the {role_match.value} advisor on the board. You recently asked the founder: '{request.question}'.\n"
                f"The founder answered: '{request.answer}'.\n"
                f"You must evaluate their answer and return a JSON object containing:\n"
                f"- 'reaction': your YC-style partner critique of their answer (max 60 words)\n"
                f"- 'confidence_change': an integer between -15 and +15 reflecting how well they answered. Be critical: dock points for vague responses, add points for concrete numbers/strategy.\n"
                f"RULES: Stay strictly in character. Do not use markdown section headers."
            )
            
            prompt = "Synthesize your reaction and confidence change in JSON."
            
            import anyio
            from google.genai import types
            class InnerEval(BaseModel):
                reaction: str
                confidence_change: int

            response = await anyio.to_thread.run_sync(
                lambda: client.models.generate_content(
                    model=settings.gemini_model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        response_mime_type="application/json",
                        response_schema=InnerEval,
                        temperature=0.3,
                    )
                )
            )
            if response.text:
                parsed = InnerEval.model_validate_json(response.text)
                reaction = parsed.reaction.strip()
                change = parsed.confidence_change
        except Exception as e:
            logger.error(f"Error calling Gemini in pitch drill: {e}")

    # Fallback to realistic mock evaluation if rate-limited or offline
    if not reaction:
        ans_lower = request.answer.lower()
        if len(request.answer) < 30:
            change = -10
            reaction = f"That answer was too brief. As the {role_match.value}, I need to see concrete data points and specific implementation plans, not high-level general statements."
        elif any(k in ans_lower for k in ["%", "10k", "100k", "dollar", "ltv", "cac", "margin", "pilot", "numbers", "user"]):
            change = 12
            reaction = f"I appreciate the specific metrics and numbers you shared. Focusing on these concrete metrics shows you understand our scaling barriers."
        else:
            change = 5
            reaction = f"A reasonable high-level overview. However, in the future, please back this up with a more detailed timeline and unit economics."

    new_conf = min(100, max(0, request.current_confidence + change))

    # Select the next role and question
    remaining = [r.value for r in session.active_agents if r.value != role_match.value]
    # Filter based on roles present in DRILL_QUESTIONS
    remaining_valid = [r for r in remaining if r in DRILL_QUESTIONS]
    
    next_role = None
    next_q = None
    if remaining_valid:
        import random
        # Just pick a random remaining role from those that have questions
        next_role = random.choice(remaining_valid)
        next_q = DRILL_QUESTIONS[next_role]

    return PitchDrillResponse(
        role=role_match.value,
        reaction=reaction,
        confidence_change=change,
        new_confidence=new_conf,
        next_role=next_role,
        next_question=next_q
    )
