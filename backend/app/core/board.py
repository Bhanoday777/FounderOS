import logging
import asyncio
from typing import AsyncGenerator, List, Dict
import time
import uuid
import anyio
from pydantic import BaseModel, Field

from ..schemas.session import (
    BoardroomSession, Role, DebateTurn, Vote, VoteOption,
    SessionState, StartupHealthScore, SynthesisResult, CategoryEvaluationDetail
)
from .agent import BoardAgent
from ..database.repository import SessionRepository
from ..config import settings
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

class BoardOrchestrator:
    def __init__(self, repository: SessionRepository, api_key: str = ""):
        self.repository = repository
        self.api_key = api_key
        self.client = None
        if api_key:
            try:
                self.client = genai.Client(api_key=api_key)
            except Exception as e:
                logger.error(f"Failed to initialize Gemini in orchestrator: {e}")

    async def _detect_domain(self, idea: str) -> str:
        """
        Classifies the startup idea into one of 12 target domains using Gemini or a regex fallback.
        """
        domains = [
            "SaaS", "Healthcare", "Cybersecurity", "Marketplace", "FinTech",
            "Education", "AI", "Climate", "Hardware", "IoT", "Developer Tools", "Gaming"
        ]
        
        system_instruction = (
            "You are a startup domain classifier. Classify the user's startup idea strictly into "
            f"one of these exact categories: {', '.join(domains)}.\n"
            "Return only the selected category name as plain text with no quotes, formatting, or extra text."
        )

        if self.client and not settings.offline_demo:
            try:
                response = await anyio.to_thread.run_sync(
                    lambda: self.client.models.generate_content(
                        model=settings.gemini_model,
                        contents=f"Classify this startup concept:\n{idea}",
                        config=types.GenerateContentConfig(
                            system_instruction=system_instruction,
                            temperature=0.1,
                        )
                    )
                )
                if response.text:
                    detected = response.text.strip()
                    if detected in domains:
                        return detected
            except Exception as e:
                logger.error(f"Error calling Gemini in _detect_domain: {e}")

        # Fallback keyword detection
        idea_lower = idea.lower()
        if any(k in idea_lower for k in ["medical", "health", "clinical", "biotech", "patient", "doctor"]):
            return "Healthcare"
        if any(k in idea_lower for k in ["crypto", "finance", "fintech", "payment", "bank", "trading", "wallet"]):
            return "FinTech"
        if any(k in idea_lower for k in ["security", "cyber", "hack", "auth", "zero-trust", "shield", "tls"]):
            return "Cybersecurity"
        if any(k in idea_lower for k in ["game", "gaming", "console", "play", "pixel"]):
            return "Gaming"
        if any(k in idea_lower for k in ["iot", "smart home", "sensor", "hardware", "device", "physical", "keyboard"]):
            return "Hardware"
        if any(k in idea_lower for k in ["carbon", "climate", "green", "solar", "wind", "energy"]):
            return "Climate"
        if any(k in idea_lower for k in ["ai", "llm", "agent", "gemini", "gpt", "neural"]):
            return "AI"
        if any(k in idea_lower for k in ["marketplace", "ecommerce", "rent", "buy", "sell"]):
            return "Marketplace"
        if any(k in idea_lower for k in ["edu", "learn", "course", "school", "teach"]):
            return "Education"
        if any(k in idea_lower for k in ["dev", "developer", "api", "code", "git", "docker", "compile"]):
            return "Developer Tools"
        return "SaaS"

    def _get_advisor_weights(self, domain: str) -> Dict[Role, float]:
        """
        Returns dynamic advisor decision weights summing to 1.0 (100%) based on detected domain.
        """
        roles = [
            Role.CEO, Role.CTO, Role.INVESTOR, Role.PRODUCT_MANAGER,
            Role.MARKETING, Role.LEGAL, Role.FINANCE, Role.SECURITY, Role.UX, Role.COMPETITION
        ]
        
        # Default weight: 10% each
        weights = {role: 0.10 for role in roles}

        if domain in ["Healthcare", "FinTech", "Cybersecurity"]:
            # Critical domains prioritize compliance, security, and capital viability
            weights[Role.LEGAL] = 0.18
            weights[Role.SECURITY] = 0.18
            weights[Role.FINANCE] = 0.18
            # Scale other 7 roles to fill remaining 46%
            other_weight = 0.46 / 7
            for role in roles:
                if role not in [Role.LEGAL, Role.SECURITY, Role.FINANCE]:
                    weights[role] = other_weight

        elif domain in ["Gaming", "Marketplace", "AI", "SaaS", "Education", "Developer Tools"]:
            # Growth domains prioritize brand reach, interaction quality, and competitor positioning
            weights[Role.MARKETING] = 0.18
            weights[Role.UX] = 0.18
            weights[Role.COMPETITION] = 0.18
            # Scale other 7 roles to fill remaining 46%
            other_weight = 0.46 / 7
            for role in roles:
                if role not in [Role.MARKETING, Role.UX, Role.COMPETITION]:
                    weights[role] = other_weight

        return weights

    def _calculate_deterministic_health_score(
        self, votes: List[Vote], weights: Dict[Role, float], domain: str, idea: str = ""
    ) -> StartupHealthScore:
        """
        Calculates Startup Health Score deterministically based on advisor weights and voting results.
        """
        if not votes:
            return StartupHealthScore(
                overall_score=0,
                approval_ratio=0.0,
                average_confidence=0.0,
                category_scores={},
                score_explanations={},
                agent_votes={},
                explainable_scores={},
                penalties=[],
                consensus_level="Split Board",
                vote_distribution={}
            )

        # Retrieve configurable advisor weights from settings if not passed
        from ..config import settings
        weights_config = settings.advisor_weights
        
        # Build weight dictionary matching Role
        weights_dict = {}
        for r in Role:
            wt = weights_config.get(r.value)
            if wt is None:
                wt = weights.get(r, 0.10) if weights else 0.10
            weights_dict[r] = wt

        approved_count = 0
        total_confidence = 0.0
        agent_votes: Dict[Role, VoteOption] = {}

        for v in votes:
            total_confidence += v.confidence
            agent_votes[v.role] = v.vote
            if v.vote in (VoteOption.APPROVE, VoteOption.CONDITIONALLY_APPROVE):
                approved_count += 1

        # Calculate category scores using advisor evaluations and configured weights
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
        category_explanations_detailed = {}
        
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
            if weight_sum > 0:
                category_scores[cat] = round(weighted_sum / weight_sum)
                category_explanations_detailed[cat] = (
                    f"Category score of {category_scores[cat]} calculated as weighted average from: "
                    f"{', '.join(contribs)}."
                )
            else:
                category_scores[cat] = 60  # Safe fallback
                category_explanations_detailed[cat] = "No advisors evaluated this category. Using default fallback score of 60."

        # ----------------------------------------------------
        # Penalty Engine (Deduplicating by reason)
        # ----------------------------------------------------
        applied_penalties = []
        applied_reasons = set()

        def add_penalty(reason: str, points: int):
            norm = reason.lower().strip()
            if norm not in applied_reasons:
                applied_reasons.add(norm)
                applied_penalties.append({"reason": reason, "points": points})

        # Aggregate penalties suggested by active advisors
        for v in votes:
            for p in getattr(v, "penalties", []):
                add_penalty(p.reason, p.points)

        total_penalties = sum(p["points"] for p in applied_penalties)

        # ----------------------------------------------------
        # Consensus Engine
        # ----------------------------------------------------
        consensus_adj = 0.0
        vote_options = [v.vote for v in votes]
        consensus_reasons = []
        
        if vote_options:
            # Check agreement level
            if all(o == VoteOption.APPROVE for o in vote_options):
                consensus_adj += 5.0
                consensus_reasons.append("Unanimous approval bonus (+5.0)")
            elif all(o == VoteOption.REJECT for o in vote_options):
                consensus_adj -= 5.0
                consensus_reasons.append("Unanimous rejection deduction (-5.0)")
            elif VoteOption.APPROVE in vote_options and VoteOption.REJECT in vote_options:
                consensus_adj -= 5.0
                consensus_reasons.append("Strong board disagreement deduction (-5.0)")

            # Check confidence level
            avg_conf = sum(v.confidence for v in votes) / len(votes)
            if avg_conf >= 80:
                consensus_adj += 2.0
                consensus_reasons.append("High board confidence bonus (+2.0)")
            elif avg_conf < 50:
                consensus_adj -= 2.0
                consensus_reasons.append("Low board confidence deduction (-2.0)")

        # Calculate base weighted category score
        weighted_cat_sum = sum(category_scores[cat] * cat_weights[cat] for cat in categories)
        weighted_cat_avg = weighted_cat_sum
        
        # Final calculated score
        raw_score = weighted_cat_avg - total_penalties + consensus_adj
        
        # Scores capped at 100
        overall_score = round(max(0.0, min(100.0, raw_score)))

        approval_ratio = round(approved_count / len(votes), 2) if votes else 0.0
        average_confidence = round(total_confidence / len(votes), 1) if votes else 0.0

        # Construct detailed score explanations for the category scores
        score_explanations = {}
        for cat in categories:
            score_explanations[cat] = category_explanations_detailed[cat]

        # Generate explainable scores breakdown
        explainable_scores = {}
        for cat in categories:
            cat_confidences = []
            cat_risks = []
            expert_reason = None
            
            # Map primary advisors for descriptions
            primary_advisors = {
                "Market Opportunity": [Role.CEO, Role.INVESTOR, Role.MARKETING],
                "Technical Feasibility": [Role.CTO, Role.SECURITY],
                "Financial Viability": [Role.FINANCE, Role.INVESTOR],
                "Execution Readiness": [Role.PRODUCT_MANAGER, Role.UX, Role.LEGAL],
                "Competitive Advantage": [Role.COMPETITION, Role.CEO, Role.INVESTOR],
                "Risk": [Role.SECURITY, Role.LEGAL, Role.FINANCE]
            }
            
            expert_roles = primary_advisors[cat]
            expert_vote = None
            for r in expert_roles:
                expert_vote = next((v for v in votes if v.role == r), None)
                if expert_vote:
                    break
            
            if not expert_vote and votes:
                expert_vote = votes[0]

            for v in votes:
                detail = next((d for d in (v.category_details or []) if d.category == cat), None)
                if detail:
                    cat_confidences.append(detail.confidence)
                    cat_risks.append(detail.risk_level)
                    if expert_vote and v.role == expert_vote.role:
                        expert_reason = detail.reason
            
            avg_cat_conf = round(sum(cat_confidences) / len(cat_confidences)) if cat_confidences else int(average_confidence)
            
            final_risk = "LOW"
            if "HIGH" in cat_risks:
                final_risk = "HIGH"
            elif "MEDIUM" in cat_risks:
                final_risk = "MEDIUM"
            
            if not expert_reason:
                expert_reason = category_explanations_detailed[cat]

            explainable_scores[cat] = CategoryEvaluationDetail(
                category=cat,
                score=category_scores[cat],
                confidence=avg_cat_conf,
                risk_level=final_risk,
                reason=expert_reason
            )

        # Explain overall score
        penalty_details = [f"{p['reason']} (-{p['points']})" for p in applied_penalties]
        penalties_str = f"Penalties: {', '.join(penalty_details)}" if penalty_details else "No penalties applied."
        consensus_str = f"Consensus Adjustments: {', '.join(consensus_reasons)}." if consensus_reasons else "No consensus adjustments."
        
        overall_reason = (
            f"Overall health score of {overall_score} calculated from "
            f"Weighted Category Score Average ({weighted_cat_avg:.1f}) "
            f"minus Total Penalty Points ({total_penalties}) "
            f"{consensus_adj:+.1f} Consensus Adjustment. "
            f"{penalties_str} {consensus_str}"
        )

        all_risks = [score_detail.risk_level for score_detail in explainable_scores.values()]
        overall_risk = "LOW"
        if "HIGH" in all_risks:
            overall_risk = "HIGH"
        elif "MEDIUM" in all_risks:
            overall_risk = "MEDIUM"

        explainable_scores["Overall Health"] = CategoryEvaluationDetail(
            category="Overall Health",
            score=overall_score,
            confidence=round(average_confidence),
            risk_level=overall_risk,
            reason=overall_reason
        )

        vote_counts = {"APPROVED": 0, "CONDITIONAL": 0, "REJECTED": 0}
        for v in votes:
            if v.vote == VoteOption.APPROVE:
                vote_counts["APPROVED"] += 1
            elif v.vote == VoteOption.CONDITIONALLY_APPROVE:
                vote_counts["CONDITIONAL"] += 1
            else:
                vote_counts["REJECTED"] += 1

        non_zero_votes = sum(1 for c in vote_counts.values() if c > 0)
        if non_zero_votes == 1:
            consensus_level = "High Consensus"
        elif vote_counts["APPROVED"] > 0 and vote_counts["REJECTED"] > 0:
            consensus_level = "Split Board"
        else:
            consensus_level = "Moderate Consensus"

        return StartupHealthScore(
            overall_score=overall_score,
            approval_ratio=approval_ratio,
            average_confidence=average_confidence,
            category_scores=category_scores,
            score_explanations=score_explanations,
            agent_votes=agent_votes,
            explainable_scores=explainable_scores,
            penalties=applied_penalties,
            consensus_level=consensus_level,
            vote_distribution=vote_counts
        )

    async def _synthesize_matrices(self, idea: str, reports_summary: str) -> Dict:
        """
        Generates the V2 matrices (risk, opportunity, action plan, and executive_summary_v2) using Gemini API.
        """
        class SynthesizedMatrices(BaseModel):
            risk_matrix: List[Dict[str, str]] = Field(..., description="List of 3 items (High, Medium, Low) containing keys: 'level', 'risk', 'mitigation'")
            opportunity_matrix: List[Dict[str, str]] = Field(..., description="List of 3 items (Immediate, Medium-term, Long-term) containing keys: 'horizon', 'opportunity', 'value'")
            action_plan: List[Dict[str, str]] = Field(..., description="List of 4 items containing keys: 'phase', 'priority', 'milestone'")
            executive_summary_v2: Dict[str, str] = Field(..., description="Keys: 'vision', 'strategic_moat', 'capital_efficiency', 'overall_verdict'")

        system_instruction = (
            "You are a Senior Venture Analyst. Analyze the board's department reports and synthesize "
            "clear structured matrices for: Risk Matrix (High/Medium/Low with actionable mitigations), "
            "Opportunity Matrix (Immediate, Medium-term, Long-term horizons with value justification), "
            "and a Milestone Action Plan (Next 30 Days, 90 Days, 6 Months, Year).\n"
            "Also synthesize a high-impact executive summary covering vision, strategic moat, capital efficiency, and overall verdict."
        )

        prompt = (
            f"Startup Concept: {idea}\n\n"
            f"Board Advisor Summarized Reports:\n{reports_summary}\n\n"
            "Synthesize and return the required matrices strictly structured in JSON."
        )

        if self.client and not settings.offline_demo:
            try:
                response = await anyio.to_thread.run_sync(
                    lambda: self.client.models.generate_content(
                        model=settings.gemini_model,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            system_instruction=system_instruction,
                            response_mime_type="application/json",
                            response_schema=SynthesizedMatrices,
                            temperature=0.2,
                        )
                    )
                )
                if response.text:
                    import json
                    return json.loads(response.text)
            except Exception as e:
                logger.error(f"Error calling Gemini in _synthesize_matrices: {e}")

        # Fallback data if API fails or is offline
        return {
            "risk_matrix": [
                {"level": "High", "risk": "Market adoption and distribution lag", "mitigation": "Launch pre-seed PLG loops early"},
                {"level": "Medium", "risk": "Scalability under concurrency spikes", "mitigation": "Optimize caching and database queries"},
                {"level": "Low", "risk": "Regulatory compliance requirements", "mitigation": "Standard Terms of Service and cookie audit"}
            ],
            "opportunity_matrix": [
                {"horizon": "Immediate", "opportunity": "Bottom-up developer community outreach", "value": "Low-cost high-signal organic acquisition"},
                {"horizon": "Medium-term", "opportunity": "Integrations marketplace", "value": "Increased retention and switching costs"},
                {"horizon": "Long-term", "opportunity": "Enterprise telemetry compliance licensing", "value": "High-margin expansion revenue"}
            ],
            "action_plan": [
                {"phase": "Next 30 Days", "priority": "Validate developer beachhead segment", "milestone": "10 customer interviews"},
                {"phase": "Next 90 Days", "priority": "Launch single-workflow MVP", "milestone": "100 active users"},
                {"phase": "Next 6 Months", "priority": "Build core telemetry pipeline", "milestone": "Implement GDPR DPAs"},
                {"phase": "Next Year", "priority": "Open Series A funding discussions", "milestone": "$50k MRR baseline"}
            ],
            "executive_summary_v2": {
                "vision": "To establish a practitioner-centric category leader in modern telemetry optimization.",
                "strategic_moat": "Compound user data moat and referral loops from community-led distribution.",
                "capital_efficiency": "High leverage from open-source seeding and bottom-up developer growth.",
                "overall_verdict": "Conditional Proceed. Defensibility must be demonstrated in the first 90 days."
            }
        }

    async def run_session(
        self, session_id: str, idea: str, active_roles: List[Role]
    ) -> AsyncGenerator[Dict, None]:
        """
        Wrapper to handle any critical orchestrator stream errors gracefully.
        """
        try:
            async for event in self._run_session_generator(session_id, idea, active_roles):
                yield event
        except Exception as e:
            logger.error(f"Critical error in boardroom orchestrator loop: {e}", exc_info=True)
            try:
                session = await self.repository.get_session(session_id)
                if session:
                    session.state = SessionState.FAILED
                    await self.repository.save_session(session)
            except Exception as repo_err:
                logger.error(f"Failed to save failed state to database: {repo_err}")
            yield {
                "event": "status",
                "data": {
                    "session_id": session_id,
                    "state": SessionState.FAILED,
                    "message": f"Critical system error: {str(e)}"
                }
            }

    async def _run_session_generator(
        self, session_id: str, idea: str, active_roles: List[Role]
    ) -> AsyncGenerator[Dict, None]:
        """
        Executes the full boardroom session state machine and streams events.
        """
        session = await self.repository.get_session(session_id)
        if not session:
            session = BoardroomSession(
                id=session_id,
                idea=idea,
                active_agents=active_roles,
                state=SessionState.INITIALIZED
            )
        else:
            session.state = SessionState.INITIALIZED
            session.turns = []
            session.votes = []
            session.health_score = None
            session.synthesis = None

        await self.repository.save_session(session)
        yield {"event": "status", "data": {"session_id": session_id, "state": session.state, "message": "Executive Board assembled."}}

        # Domain Detection
        domain = await self._detect_domain(idea)
        weights = self._get_advisor_weights(domain)
        session.domain = domain
        await self.repository.save_session(session)
        yield {"event": "status", "data": {"session_id": session_id, "state": session.state, "message": f"Domain identified: {domain}."}}

        # Instantiate agents
        agents = {role: BoardAgent(role, self.api_key) for role in active_roles}
        history: List[str] = [f"System: Detected startup domain is {domain}."]

        # Stream initial WAITING state for all active roles
        for r in active_roles:
            yield {"event": "advisor_status", "data": {"role": r, "state": "WAITING", "details": "Conjoined to operational center. Waiting..."}}

        # ----------------------------------------------------
        # ROUND 1: Independent Analysis
        # ----------------------------------------------------
        session.state = SessionState.ROUND_1_ANALYSIS
        await self.repository.save_session(session)
        yield {"event": "status", "data": {"session_id": session_id, "state": session.state, "message": "Round 1: Gathering independent advisor critiques..."}}

        for role in active_roles:
            # Set other active roles that already spoke to REVIEWING, and others to WAITING
            for other_role in active_roles:
                if other_role != role:
                    has_spoken = any(t.role == other_role and t.round == 1 for t in session.turns)
                    st = "REVIEWING" if has_spoken else "WAITING"
                    det = f"Reviewing analysis from other board members..." if has_spoken else "Waiting to speak..."
                    yield {"event": "advisor_status", "data": {"role": other_role, "state": st, "details": det}}

            yield {"event": "advisor_status", "data": {"role": role, "state": "THINKING", "details": f"Critiquing startup concept priorities from a {role.value} perspective..."}}
            await asyncio.sleep(0.5)  # Make state transition visible
            
            agent = agents[role]
            opinion = await agent.generate_opinion(idea, history, round=1)
            
            yield {"event": "advisor_status", "data": {"role": role, "state": "SPEAKING", "details": f"Presenting independent assessment..."}}
            await asyncio.sleep(0.2)
            
            turn = DebateTurn(
                id=str(uuid.uuid4()),
                role=role,
                round=1,
                content=opinion
            )
            session.turns.append(turn)
            history.append(f"{role.value} (Round 1): {opinion}")
            
            await self.repository.save_session(session)
            yield {"event": "turn", "data": turn.model_dump()}
            
            yield {"event": "advisor_status", "data": {"role": role, "state": "REVIEWING", "details": "Listening to other critiques..."}}
            await asyncio.sleep(0.1)

        # ----------------------------------------------------
        # ROUND 2: Cross-Examination (Contrasting Viewpoints)
        # ----------------------------------------------------
        session.state = SessionState.ROUND_2_DEBATE
        await self.repository.save_session(session)
        yield {"event": "status", "data": {"session_id": session_id, "state": session.state, "message": "Round 2: Dynamic cross-examination..."}}

        debating_roles = [Role.CEO, Role.CTO, Role.INVESTOR]
        if domain in ["Healthcare", "FinTech", "Cybersecurity"]:
            debating_roles.extend([Role.LEGAL, Role.SECURITY])
        else:
            debating_roles.extend([Role.UX, Role.MARKETING])

        # Filter to only active roles
        debating_roles = [r for r in debating_roles if r in active_roles]

        for role in active_roles:
            # Set initial Round 2 states
            st = "REVIEWING" if role in debating_roles else "WAITING"
            det = "Preparing to respond in debate..." if role in debating_roles else "Observing cross-debate..."
            yield {"event": "advisor_status", "data": {"role": role, "state": st, "details": det}}

        for role in debating_roles:
            # Set other active roles to REVIEWING
            for other_role in active_roles:
                if other_role != role:
                    yield {"event": "advisor_status", "data": {"role": other_role, "state": "REVIEWING", "details": f"Analyzing cross-examination comments..."}}

            yield {"event": "advisor_status", "data": {"role": role, "state": "THINKING", "details": "Formulating rebuttal and addressing other advisors..."}}
            await asyncio.sleep(0.5)

            agent = agents[role]
            opinion = await agent.generate_opinion(idea, history, round=2)
            
            yield {"event": "advisor_status", "data": {"role": role, "state": "SPEAKING", "details": "Speaking in cross-examination..."}}
            await asyncio.sleep(0.2)
            
            turn = DebateTurn(
                id=str(uuid.uuid4()),
                role=role,
                round=2,
                content=opinion
            )
            session.turns.append(turn)
            history.append(f"{role.value} (Round 2): {opinion}")
            
            await self.repository.save_session(session)
            yield {"event": "turn", "data": turn.model_dump()}
            
            yield {"event": "advisor_status", "data": {"role": role, "state": "REVIEWING", "details": "Finished speaking. Analyzing arguments..."}}
            await asyncio.sleep(0.1)

        # ----------------------------------------------------
        # ROUND 3: Consensus & Revision
        # ----------------------------------------------------
        session.state = SessionState.ROUND_3_REVISION
        await self.repository.save_session(session)
        yield {"event": "status", "data": {"session_id": session_id, "state": session.state, "message": "Round 3: Reconciling views and driving consensus..."}}

        for role in active_roles:
            for other_role in active_roles:
                if other_role != role:
                    has_spoken = any(t.role == other_role and t.round == 3 for t in session.turns)
                    st = "REVIEWING" if has_spoken else "WAITING"
                    det = "Reviewing revised alignments..." if has_spoken else "Waiting to present final alignment..."
                    yield {"event": "advisor_status", "data": {"role": other_role, "state": st, "details": det}}

            yield {"event": "advisor_status", "data": {"role": role, "state": "THINKING", "details": "Reconciling peer feedback and formulating consensus statement..."}}
            await asyncio.sleep(0.5)

            agent = agents[role]
            opinion = await agent.generate_opinion(idea, history, round=3)

            yield {"event": "advisor_status", "data": {"role": role, "state": "SPEAKING", "details": "Presenting revised stance..."}}
            await asyncio.sleep(0.2)

            turn = DebateTurn(
                id=str(uuid.uuid4()),
                role=role,
                round=3,
                content=opinion
            )
            session.turns.append(turn)
            history.append(f"{role.value} (Round 3 Revision): {opinion}")

            await self.repository.save_session(session)
            yield {"event": "turn", "data": turn.model_dump()}

            yield {"event": "advisor_status", "data": {"role": role, "state": "REVIEWING", "details": "Listening to other revised stances..."}}
            await asyncio.sleep(0.1)

        # ----------------------------------------------------
        # ROUND 4: Voting
        # ----------------------------------------------------
        session.state = SessionState.VOTING
        await self.repository.save_session(session)
        yield {"event": "status", "data": {"session_id": session_id, "state": session.state, "message": "Round 4: Ballot voting concluded..."}}

        for role in active_roles:
            # Set other active roles to WAITING or REVIEWING
            for other_role in active_roles:
                if other_role != role:
                    has_voted = any(v.role == other_role for v in session.votes)
                    st = "COMPLETED" if has_voted else "WAITING"
                    det = "Ballot cast successfully." if has_voted else "Awaiting voting slot..."
                    yield {"event": "advisor_status", "data": {"role": other_role, "state": st, "details": det}}

            yield {"event": "advisor_status", "data": {"role": role, "state": "VOTING", "details": "Analyzing consensus and compiling structured evaluations..."}}
            await asyncio.sleep(0.5)

            agent = agents[role]
            vote = await agent.cast_vote(idea, history)
            session.votes.append(vote)
            
            await self.repository.save_session(session)
            yield {"event": "vote", "data": vote.model_dump()}
            
            yield {"event": "advisor_status", "data": {"role": role, "state": "COMPLETED", "details": f"Voted: {vote.vote.value} (Confidence: {vote.confidence}%)"}}
            await asyncio.sleep(0.1)

        # Calculate final structured health score
        health_score = self._calculate_deterministic_health_score(session.votes, weights, domain)
        session.health_score = health_score
        await self.repository.save_session(session)
        yield {"event": "health_score", "data": health_score.model_dump()}

        # ----------------------------------------------------
        # ROUND 5: Parallel Deliverable Synthesis
        # ----------------------------------------------------
        session.state = SessionState.SYNTHESIS
        await self.repository.save_session(session)
        yield {"event": "status", "data": {"session_id": session_id, "state": session.state, "message": "Round 5: Generating specialized reports..."}}

        for role in active_roles:
            yield {"event": "advisor_status", "data": {"role": role, "state": "THINKING", "details": f"Compiling final {role.value} report..."}}

        # Define generation task wrappers for each of the 10 roles
        async def make_report(role: Role, topic: str):
            agent = agents.get(role) or BoardAgent(role, self.api_key)

            role_prompts = {
                Role.CEO: (
                    "Prepare your final Executive Summary based on the full board discussion. "
                    "Format output STRICTLY with these section headers (use markdown ### headers):\n"
                    "### Startup Summary\n"
                    "### Strengths\n2-3 key strategic advantages with specific reasoning.\n"
                    "### Weaknesses\n2-3 primary challenges or execution constraints.\n"
                    "### Critical Risks\nTop risks flagged by the board (technical, legal, market, financial).\n"
                    "### Biggest Unknowns\n1-2 open questions that could materially change the outcome.\n"
                    "### Recommended Next Steps\nNumbered list of 3-4 concrete, prioritized actions.\n"
                    "### Investment Recommendation\nClear directive: PROCEED / CONDITIONAL PROCEED / PIVOT / REJECT with rationale.\n"
                    "### Board Consensus\nSummarize vote distribution and any blocking concerns."
                ),
                Role.CTO: (
                    "Prepare your final System Architecture Specification based on the board discussion. "
                    "Format output STRICTLY with these section headers:\n"
                    "### Recommended Tech Stack\nList frontend, backend, database, caching, messaging layers with justification.\n"
                    "### Scalability Assessment\nAt what user volume does the architecture require rework? What are the p99 latency targets?\n"
                    "### Authentication & Security Architecture\nSpecify OAuth flow, JWT TTL, encryption standards.\n"
                    "### Critical Technical Risks\n2-3 specific engineering risks and mitigation strategies.\n"
                    "### Infrastructure Cost Model\nEstimated monthly cost at 1K, 10K, and 100K active users.\n"
                    "### Architecture Recommendation\nFinal technical approval status with conditions if any."
                ),
                Role.INVESTOR: (
                    "Prepare your final Investment Memorandum based on the board discussion. "
                    "Format output STRICTLY with these section headers:\n"
                    "### Market Opportunity\nTAM estimate, growth rate, and venture scale viability.\n"
                    "### Unit Economics Targets\nLTV/CAC ratio target, gross margin target, payback period, NRR target.\n"
                    "### Competitive Moat Assessment\nIs there a defensible moat? Rate as Strong / Moderate / Weak.\n"
                    "### Funding Recommendation\nFunding stage, suggested check size, instrument (SAFE/priced round), pre-money valuation range.\n"
                    "### Investment Conditions\nSpecific milestones required before capital deployment.\n"
                    "### Risk Factors\nTop 3 investor-level risks ranked by impact."
                ),
                Role.PRODUCT_MANAGER: (
                    "Prepare your final MVP Execution Roadmap based on the board discussion. "
                    "Format output STRICTLY with these section headers:\n"
                    "### North Star Metric\nSingle metric that defines Week 1 success and rationale.\n"
                    "### First 100 Users\nExact profile of the target early adopter (role, company size, workflow).\n"
                    "### Week 1-4 Scope\nWhat ships in the first sprint — and what is explicitly cut.\n"
                    "### Week 5-8 Scope\nInstrumentation, feedback loops, and first iteration.\n"
                    "### Week 9-12 Scope\nRetention mechanics, conversion triggers, and paid tier launch.\n"
                    "### Success Gate\nThe specific activation or retention benchmark required before scaling GTM."
                ),
                Role.MARKETING: (
                    "Prepare your final Go-To-Market Strategy based on the board discussion. "
                    "Format output STRICTLY with these section headers:\n"
                    "### Brand Positioning\nOne-sentence positioning statement and category definition.\n"
                    "### Target Customer Profile\nPrimary buyer persona with demographics, job title, and pain points.\n"
                    "### Acquisition Channels\nRanked list of organic channels with expected CAC and k-factor estimate.\n"
                    "### Content Moat Strategy\nTop 5 SEO topics to own and community strategy.\n"
                    "### Launch Sequence\nPhased GTM: pre-launch, launch week, post-launch growth.\n"
                    "### CAC Target & Budget\nMaximum acceptable blended CAC and month 1-3 marketing budget allocation."
                ),
                Role.FINANCE: (
                    "Prepare your final Financial Forecast Report based on the board discussion. "
                    "Format output STRICTLY with these section headers:\n"
                    "### Revenue Model\nPricing tiers with specific dollar amounts and target conversion rates.\n"
                    "### Gross Margin Analysis\nCOGS breakdown per unit/user and projected gross margin at scale.\n"
                    "### Burn Rate & Runway\nMonthly operating cost and runway at seed funding amount.\n"
                    "### Break-Even Analysis\nCustomer count and MRR required for break-even.\n"
                    "### 24-Month Cash Flow Summary\nConservative, base, and optimistic revenue scenarios.\n"
                    "### Financial Risk Flags\nTop 3 financial risks and mitigation strategies."
                ),
                Role.LEGAL: (
                    "Prepare your final Compliance Audit Checklist based on the board discussion. "
                    "Format as a detailed checklist with checkbox items [ ] grouped by category:\n"
                    "### GDPR Compliance (EU)\nList all required actions.\n"
                    "### CCPA Compliance (California)\nList all required actions.\n"
                    "### Intellectual Property\nIP assignment, trademark, third-party license review.\n"
                    "### Terms of Service & Privacy Policy\nRequired disclosures and clauses.\n"
                    "### Sector-Specific Regulation\nAny HIPAA, PCI-DSS, SOC 2, or other applicable requirements.\n"
                    "### Legal Blockers\nAny items that must be resolved before product launch."
                ),
                Role.SECURITY: (
                    "Prepare your final Security Risk Assessment based on the board discussion. "
                    "Format output STRICTLY with these section headers:\n"
                    "### Threat Model Summary\nTop 3 adversary profiles and their likely attack vectors.\n"
                    "### OWASP Top 10 Exposure\nWhich of the Top 10 risks apply and current mitigation status.\n"
                    "### Pre-Launch Security Controls\nRequired controls that must be in place before public launch.\n"
                    "### Authentication & Authorization Architecture\nSpecify exact protocols, TTLs, and rotation policies.\n"
                    "### Data Security Requirements\nEncryption standards, audit logging, and access control model.\n"
                    "### Security Recommendation\nOverall security posture rating (Red/Yellow/Green) and required actions."
                ),
                Role.UX: (
                    "Prepare your final User Experience Friction Review based on the board discussion. "
                    "Format output STRICTLY with these section headers:\n"
                    "### Onboarding Assessment\nTime-to-first-value estimate and onboarding step count analysis.\n"
                    "### Critical Friction Points\nTop 3 UX friction points with estimated impact on activation rate.\n"
                    "### Information Architecture Review\nIs the navigation user-centric or system-centric? What needs to change?\n"
                    "### Accessibility Audit\nWCAG 2.1 AA compliance gaps and required fixes.\n"
                    "### Retention UX Levers\nSpecific UX changes that will improve D7 and D30 retention.\n"
                    "### UX Recommendation\nOverall UX readiness rating and must-fix list before launch."
                ),
                Role.COMPETITION: (
                    "Prepare your final Competitive Landscape Matrix based on the board discussion. "
                    "Format output STRICTLY with these section headers:\n"
                    "### Direct Competitor Analysis\nName 2-3 direct competitors with their positioning and key weaknesses.\n"
                    "### Indirect Competitor Analysis\nName 1-2 indirect substitutes (e.g., spreadsheets, manual processes).\n"
                    "### Porter's Five Forces Assessment\nRate each force (Low/Medium/High) with one-sentence justification.\n"
                    "### Differentiation Strategy\nWhat makes this product defensible that incumbents cannot easily replicate?\n"
                    "### Switching Cost Architecture\nHow do we engineer lock-in through data, workflow, or community?\n"
                    "### Competitive Verdict\nBlue Ocean / Red Ocean / Niche Beachhead — with 12-month competitive timeline."
                ),
            }

            prompt = role_prompts.get(role, (
                f"Prepare your final {topic} based on the board discussion. "
                "Be specific, use structured section headers, and reflect your domain's specialized expertise."
            ))
            return await agent.generate_opinion(idea, history + [f"System: {prompt}"], round=3)

        # Run all 10 reports in parallel
        try:
            reports = await asyncio.gather(
                make_report(Role.CEO, "Executive Summary"),
                make_report(Role.CTO, "System Architecture Specification"),
                make_report(Role.INVESTOR, "Investment Memo"),
                make_report(Role.PRODUCT_MANAGER, "MVP Execution Roadmap"),
                make_report(Role.MARKETING, "Go-To-Market Strategy"),
                make_report(Role.FINANCE, "Financial Forecast Report"),
                make_report(Role.LEGAL, "Compliance Audit Checklist"),
                make_report(Role.SECURITY, "Security Risk Assessment"),
                make_report(Role.UX, "User Experience Friction Review"),
                make_report(Role.COMPETITION, "Competitive Landscape Matrix")
            )
        except Exception as e:
            logger.error(f"Deliverable synthesis failed: {e}")
            reports = ["Failed to compile report"] * 10

        # Roadmap requires parsing to list
        roadmap_lines = [line.strip().lstrip("-*123456789. ") for line in reports[3].split("\n") if line.strip()]
        # Legal checklist requires list parsing
        compliance_lines = [line.strip().lstrip("-*123456789. ") for line in reports[6].split("\n") if line.strip()]

        # Synthesize matrices and executive summary V2
        reports_summary = "\n\n".join([
            f"=== {role.value} report ===\n{report}" 
            for role, report in zip(active_roles, reports)
        ])
        matrices = await self._synthesize_matrices(idea, reports_summary)

        synthesis = SynthesisResult(
            executive_summary=reports[0],
            architecture=reports[1],
            investment_memo=reports[2],
            roadmap=roadmap_lines,
            go_to_market=reports[4],
            financial_report=reports[5],
            compliance_checklist=compliance_lines,
            security_assessment=reports[7],
            ux_review=reports[8],
            competitive_landscape=reports[9],
            risk_matrix=matrices.get("risk_matrix", []),
            opportunity_matrix=matrices.get("opportunity_matrix", []),
            action_plan=matrices.get("action_plan", []),
            executive_summary_v2=matrices.get("executive_summary_v2")
        )

        session.synthesis = synthesis
        session.state = SessionState.COMPLETED
        await self.repository.save_session(session)

        # Mark all as complete
        for role in active_roles:
            yield {"event": "advisor_status", "data": {"role": role, "state": "COMPLETED", "details": "Report compiled successfully."}}

        yield {"event": "synthesis", "data": synthesis.model_dump()}
        yield {"event": "status", "data": {"session_id": session_id, "state": session.state, "message": "Executive session adjourned."}}
