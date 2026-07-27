import logging
import anyio
from typing import List, Optional, Dict
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
from ..schemas.session import Role, Vote, VoteOption, CategoryEvaluationDetail, AgentPenaltySuggestion
from .personas import AGENT_PERSONAS
from ..config import settings

logger = logging.getLogger(__name__)

class AgentVoteResponse(BaseModel):
    vote: str = Field(..., description="The structured vote selection: APPROVE, CONDITIONALLY_APPROVE, REJECT")
    confidence: int = Field(..., ge=0, le=100, description="Confidence rating between 0 and 100")
    
    # 6 target categories. Each agent should only score the ones relevant to their role, leaving others None.
    market_opportunity: Optional[int] = Field(None, ge=0, le=100, description="TAM, PMF, market demand, timing. Scored by CEO, Investor, Marketing, Competition, PM.")
    technical_feasibility: Optional[int] = Field(None, ge=0, le=100, description="Tech stack, engineering difficulty, build time. Scored by CTO, Security.")
    financial_viability: Optional[int] = Field(None, ge=0, le=100, description="Pricing model, COGS, burn, economics, runway. Scored by Finance, Investor.")
    execution_readiness: Optional[int] = Field(None, ge=0, le=100, description="MVP scope, UX friction, regulatory, timeline. Scored by PM, UX, Legal.")
    competitive_advantage: Optional[int] = Field(None, ge=0, le=100, description="Moat, switching barriers, differentiation. Scored by Competition, CEO, Investor, Marketing.")
    risk: Optional[int] = Field(None, ge=0, le=100, description="Risk safety score (100 = low risk, 0 = high risk). Scored by Security, Legal, Finance, CTO, Investor.")

    strengths: List[str] = Field(..., description="Top 2-3 key strategic strengths of the startup")
    weaknesses: List[str] = Field(..., description="Top 2-3 core weaknesses of the startup")
    critical_risks: List[str] = Field(..., description="Top 1-2 critical risks or execution bottlenecks")
    
    critical_assumption: str = Field(..., description="The single most critical assumption you are making to support your vote")
    biggest_concern: str = Field(..., description="The single biggest concern or risk you see for this startup")
    
    penalties: List[AgentPenaltySuggestion] = Field(
        default_factory=list,
        description="Applied or recommended deterministic penalties from the options list"
    )
    reasoning: str = Field(..., description="YC partner style reasoning (100-150 words) justifying your vote and scores")
    blocking_concern: Optional[str] = Field(default=None, description="A single concrete blocking concern if voting REJECT or CONDITIONALLY_APPROVE")

class BoardAgent:
    def __init__(self, role: Role, api_key: str = ""):
        self.role = role
        self.persona = AGENT_PERSONAS.get(role, f"You are the {role.value} on the board.")
        self.api_key = api_key
        self.client = None
        if api_key:
            try:
                self.client = genai.Client(api_key=api_key)
            except Exception as e:
                logger.error(f"Failed to initialize Gemini Client for {self.role}: {e}")

    async def generate_opinion(self, idea: str, history: List[str], round: int) -> str:
        """
        Asynchronously generates a debate opinion using Gemini API or a role-specific mock fallback.
        """
        role_focuses = {
            Role.CEO: (
                "Focus on: TAM sizing, product-market fit signals, strategic moat potential, and market timing. "
                "Speak with conviction about long-term category leadership. Reference comparable market expansions. "
                "Push for bold pivots when execution or market signals look weak. Never accept mediocre positioning."
            ),
            Role.CTO: (
                "Focus on: technical feasibility constraints, architecture scalability limits (p99 latency, DB sharding, CDN strategy), "
                "API dependency risks, cold start overhead, and realistic infrastructure cost modeling at 10K/100K users. "
                "Name specific technologies and call out engineering risks with precision. Kill hype with engineering reality."
            ),
            Role.INVESTOR: (
                "Focus on: LTV/CAC ratio, gross margin potential, blended CAC by acquisition channel, payback period, "
                "competitive moat defensibility, and TAM viability for venture scale. "
                "Be blunt and skeptical. Stress-test every assumption. Demand proof of a proprietary data moat or structural cost advantage."
            ),
            Role.PRODUCT_MANAGER: (
                "Focus on: MVP scope reduction, the single north star metric for Week 1, time-to-first-value, "
                "onboarding completion rate risks, and defining the first 100 passionate users. "
                "Cut scope ruthlessly. Any MVP that cannot ship in 8 weeks is already failing."
            ),
            Role.MARKETING: (
                "Focus on: organic acquisition loops (content, community, virality), k-factor potential, "
                "blended CAC vs. paid CAC, and whether the product has inherent shareability. "
                "Refuse any GTM that relies primarily on paid ads. Demand a content moat or community-led growth engine."
            ),
            Role.LEGAL: (
                "Focus on: GDPR/CCPA compliance obligations, IP ownership clarity, third-party API license restrictions, "
                "sector-specific regulatory burden (HIPAA, PCI-DSS, SOC 2), and liability exposure. "
                "Quantify regulatory risk. Never assume compliance is easy. Flag any PII handling without a formal audit trail."
            ),
            Role.FINANCE: (
                "Focus on: gross margin structure (target >70% SaaS, >40% marketplace), monthly burn rate, "
                "COGS breakdown, contribution margin per customer, and EBITDA path. "
                "Demand explicit unit economics. Reject any model with a multi-year CAC payback without exceptional NRR."
            ),
            Role.SECURITY: (
                "Focus on: OWASP Top 10 attack surface, authentication scheme (OAuth 2.0/PKCE), "
                "encryption at rest (AES-256) and in transit (TLS 1.3), secret rotation strategy, and zero-trust readiness. "
                "Be adversarial. Assume a partial breach has already occurred. Demand immutable audit logs and threat models."
            ),
            Role.UX: (
                "Focus on: time-to-first-value (<60 seconds), onboarding step count (reject >3 steps), "
                "cognitive load assessment, WCAG 2.1 AA accessibility, and D30 retention correlation with UX quality. "
                "Champion the user. Flag every friction point as a conversion killer."
            ),
            Role.COMPETITION: (
                "Focus on: identifying at least 3 specific direct/indirect competitors, applying Porter's Five Forces, "
                "articulating why incumbents cannot copy this in 18 months, and quantifying switching costs. "
                "Reject any 'we have no competitors' narrative. Map the 2x2 positioning matrix explicitly."
            )
        }
        focus_prompt = role_focuses.get(self.role, "Analyze the startup idea from your specialized department perspective.")

        if round == 1:
            dynamics_instruction = (
                "MEETING DYNAMICS — ROUND 1 INDEPENDENT ANALYSIS:\n"
                "This is your independent, unfiltered assessment. Evaluate the startup idea solely based on the details provided.\n"
                "CRITICAL EVIDENCE RULES:\n"
                "- Do NOT invent data like revenue, margins, CAC, LTV, retention, or infra costs if they are not explicitly provided.\n"
                "- If data is missing, list it explicitly under 'Missing Information'. Don't guess.\n"
                "- Focus on: Can this risk be mitigated? rather than just listing negatives."
            )
        elif round == 2:
            dynamics_instruction = (
                "MEETING DYNAMICS — ROUND 2 CROSS-EXAMINATION:\n"
                "Read the other advisors' Round 1 assessments. Agree where appropriate, challenge weak assumptions, support good ideas, "
                "identify contradictions, and build upon useful suggestions. Do NOT repeat your original opinion.\n"
                "You MUST directly reference at least one other board member by name (e.g., 'I disagree with the Investor...', "
                "'The CTO correctly identified...')."
            )
        else:
            dynamics_instruction = (
                "MEETING DYNAMICS — ROUND 3 CONSENSUS & REVISION:\n"
                "Formulate your revised opinion looking for consensus. Explicitly mention peer perspectives (e.g., 'After hearing the CTO...', "
                "'I agree with the CFO...'). Focus on whether the overall opportunity outweighs the mitigated risks.\n"
                "Enforce the final consensus alignment."
            )

        system_instruction = (
            f"{self.persona}\n\n"
            f"You are in a live multi-agent executive board meeting evaluating a startup concept.\n"
            f"CRITICAL DIALOGUE INSTRUCTIONS:\n"
            f"1. DOMAIN FOCUS: {focus_prompt}\n"
            f"2. {dynamics_instruction}\n"
            f"3. ROLE FIDELITY: Stay strictly within your expert domain. Never comment on other departments unless responding directly to a peer during debate.\n"
            f"4. EVIDENCE HIERARCHY: Prioritize explicit founder details -> industry knowledge -> labeled assumptions -> unknowns.\n"
            f"5. NO MARKDOWN TEMPLATES: Do NOT use section headers (like '###', '##'), bulleted tables, or long-form reports. "
            f"This is a verbal boardroom discussion, not a written memo. Speak in 1-2 concise, conversational, but highly analytical paragraphs "
            f"(between 100 and 150 words max). Be direct, professional, and clear."
        )

        prompt = (
            f"Startup Idea: {idea}\n\n"
            f"Debate History So Far:\n"
            + "\n".join(history)
            + f"\n\nNow, write your spoken comments for Round {round}."
        )

        if self.client and not settings.offline_demo:
            try:
                response = await anyio.to_thread.run_sync(
                    lambda: self.client.models.generate_content(
                        model=settings.gemini_model,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            system_instruction=system_instruction,
                            temperature=0.7,
                        )
                    )
                )
                if response.text:
                    return response.text.strip()
            except Exception as e:
                logger.error(f"Error calling Gemini in generate_opinion for {self.role}: {e}")

        return self._generate_mock_opinion(idea, history, round)

    async def cast_vote(self, idea: str, history: List[str]) -> Vote:
        """
        Asynchronously casts a structured vote using Gemini API or a role-specific mock fallback.
        """
        role_categories = {
            Role.CEO: "market_opportunity, execution_readiness, competitive_advantage",
            Role.CTO: "technical_feasibility, risk",
            Role.INVESTOR: "market_opportunity, financial_viability, competitive_advantage, risk",
            Role.PRODUCT_MANAGER: "execution_readiness, market_opportunity",
            Role.MARKETING: "market_opportunity, competitive_advantage",
            Role.LEGAL: "execution_readiness, risk",
            Role.FINANCE: "financial_viability, risk",
            Role.SECURITY: "technical_feasibility, risk",
            Role.UX: "execution_readiness",
            Role.COMPETITION: "competitive_advantage, market_opportunity"
        }
        cats = role_categories.get(self.role, "market_opportunity, execution_readiness")

        system_instruction = (
            f"{self.persona}\n\n"
            f"The board discussion has concluded. You must now cast your structured vote on the startup idea.\n"
            f"CRITICAL INSTRUCTIONS:\n"
            f"1. CATEGORY OWNERSHIP: You ONLY score categories you own as {self.role.value}. Specifically populate: {cats}. Leave all other fields null.\n"
            f"2. VOTE ALIGNMENT: Your vote (APPROVE, CONDITIONALLY_APPROVE, REJECT) must honestly reflect the debate. Reject only if a critical flaw cannot realistically be mitigated. Prefer Conditional if risks are solvable.\n"
            f"3. CRITICAL ASSUMPTION: Specify the single most critical assumption you are making to support your vote (use critical_assumption field).\n"
            f"4. BIGGEST CONCERN: Specify the single biggest concern/risk you see (use biggest_concern field).\n"
            f"5. REASONING (100-150 words): Justify your decision citing explicit evidence or missing info.\n"
            f"6. PENALTIES: Assign relevant penalties from the options list if applicable.\n"
            f"7. CONFIDENCE: Rate from 0 to 100%. Decrease confidence if you made many assumptions."
        )

        prompt = (
            f"Startup Idea: {idea}\n\n"
            f"Debate History:\n"
            + "\n".join(history)
            + f"\n\nBased on this board discussion, cast your final vote."
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
                            response_schema=AgentVoteResponse,
                            temperature=0.2,
                        )
                    )
                )
                if response.text:
                    parsed = AgentVoteResponse.model_validate_json(response.text)
                    
                    sub_scores = {
                        "Market Opportunity": parsed.market_opportunity,
                        "Technical Feasibility": parsed.technical_feasibility,
                        "Financial Viability": parsed.financial_viability,
                        "Execution Readiness": parsed.execution_readiness,
                        "Competitive Advantage": parsed.competitive_advantage,
                        "Risk": parsed.risk,
                    }
                    
                    flat_evals = {k: v for k, v in sub_scores.items() if v is not None}
                    details = []
                    for cat, val in flat_evals.items():
                        details.append(CategoryEvaluationDetail(
                            category=cat,
                            score=val,
                            confidence=parsed.confidence,
                            risk_level="LOW" if val >= 70 else "MEDIUM" if val >= 45 else "HIGH",
                            reason=f"Evaluated by {self.role.value} with confidence {parsed.confidence}%."
                        ))

                    vote_str = parsed.vote.upper().strip()
                    if vote_str == "CONDITIONAL" or vote_str == "CONDITIONALLY_APPROVE":
                        vote_opt = VoteOption.CONDITIONALLY_APPROVE
                    elif vote_str == "APPROVE":
                        vote_opt = VoteOption.APPROVE
                    else:
                        vote_opt = VoteOption.REJECT

                    return Vote(
                        role=self.role,
                        vote=vote_opt,
                        confidence=parsed.confidence,
                        category_evaluations=flat_evals,
                        category_details=details,
                        reasoning=parsed.reasoning,
                        blocking_concern=parsed.blocking_concern,
                        penalties=parsed.penalties,
                        critical_assumption=parsed.critical_assumption,
                        biggest_concern=parsed.biggest_concern
                    )
            except Exception as e:
                logger.error(f"Error calling Gemini in cast_vote for {self.role}: {e}")

        return self._generate_mock_vote(idea, history)

    def _is_physical_logistics(self, idea: str) -> bool:
        keywords = ["keyboard", "rent", "physical", "warehouse", "delivery", "box", "shipping", "logistics", "hardware", "device"]
        return any(k in idea.lower() for k in keywords)

    def _get_startup_keywords(self, idea: str) -> tuple[str, str]:
        words = [w.strip(".,-\"()").lower() for w in idea.split()]
        nouns = [w for w in words if len(w) > 4 and w not in [
            "about", "their", "there", "would", "could", "should", "platform", "system", 
            "service", "startup", "product", "business", "target", "market", "using", 
            "features", "based", "helps", "allows", "users", "customers", "provide"
        ]]
        kw1 = nouns[0] if len(nouns) > 0 else "product"
        kw2 = nouns[1] if len(nouns) > 1 else "service"
        return kw1.capitalize(), kw2.lower()

    def _generate_mock_opinion(self, idea: str, history: List[str], round: int) -> str:
        kw1, kw2 = self._get_startup_keywords(idea)
        is_physical = self._is_physical_logistics(idea)

        if round == 1:
            if self.role == Role.CEO:
                return (
                    f"The core question here is whether {kw1} can achieve category leadership within 36 months or become a feature "
                    f"acquisition target. The TAM for this space is meaningful — but only if the product establishes a defensible "
                    f"platform moat rather than remaining a point solution. My concern is timing: the market is crowded with "
                    f"well-funded incumbents who have 12-month head starts on distribution. "
                    f"The value proposition around {kw2} is clear, but vision alone does not build a moat. "
                    f"We need a land-and-expand strategy — start with one deeply-converted customer segment, "
                    f"collect proprietary behavioral data, and use that as a structural barrier before scaling GTM spend. "
                    f"Without a credible path to category leadership, we are building a feature, not a company."
                )
            elif self.role == Role.CTO:
                return (
                    f"From an architecture standpoint, {kw1} is buildable — the engineering is not the risk, the scalability ceiling is. "
                    f"At sub-1K users, any monolith will work. The question is what happens at 10K concurrent sessions: "
                    f"without a Redis cache-aside layer and horizontal pod autoscaling, p99 latency will degrade sharply under real load. "
                    f"I am also concerned about the {kw2} dependency — if this relies on third-party APIs without circuit breakers "
                    f"and rate-limit handling, a single upstream outage cascades into a full product failure. "
                    f"The authentication flow needs explicit design: are we using OAuth 2.0 with PKCE, or rolling a custom session store? "
                    f"Custom session stores introduce token replay vulnerabilities. "
                    f"Before we approve any engineering resources, I want to see an explicit architecture decision record (ADR) "
                    f"covering the data layer, caching strategy, and auth protocol."
                )
            elif self.role == Role.INVESTOR:
                return (
                    f"I will be direct: the unit economics for {kw1} are unproven at every level that matters. "
                    f"What is the blended CAC today, and what does it look like at 1,000 customers without a paid acquisition budget? "
                    f"If the answer involves organic community growth alone, I need to see evidence — not a hypothesis. "
                    f"The LTV/CAC ratio needs to exceed 3x within 18 months for this to be Series A fundable. "
                    f"Current gross margin assumptions for {kw2} look optimistic — if COGS exceeds 30% of revenue, "
                    f"the business cannot sustain venture-scale growth without burning through capital on operations. "
                    f"My deeper concern is defensibility: what prevents the three dominant players in this space "
                    f"from shipping a competing feature in 90 days? If the answer is 'nothing,' this is an acqui-hire, not a company."
                )
            elif self.role == Role.PRODUCT_MANAGER:
                return (
                    f"The MVP scope for {kw1} is too wide. I see at least four distinct product surfaces here — "
                    f"each of which could be a standalone company. We need to apply strict MoSCoW prioritization: "
                    f"what is the single workflow that delivers the aha moment within 60 seconds of signup? "
                    f"That is the only thing that ships in V1. Everything else is a distraction. "
                    f"The north star metric should be activation rate — specifically, the percentage of new users "
                    f"who complete one meaningful action within their first session. "
                    f"I want to define the first 100 passionate users before writing a single line of code: "
                    f"Are they individual {kw2} practitioners, enterprise team leads, or technical buyers? "
                    f"The answer to that question determines every product decision downstream."
                )
            elif self.role == Role.MARKETING:
                return (
                    f"The GTM strategy for {kw1} cannot be built on paid acquisition — not at pre-seed burn rates. "
                    f"I ran the numbers: at a conservative $80 blended CAC through paid channels and a 12-month LTV of $240, "
                    f"we are at a 3x ratio before churn, which sounds passable until you factor in D30 retention risk. "
                    f"The only sustainable path is an organic content flywheel: "
                    f"own the top 20 high-intent search queries in the {kw2} space through authentic thought leadership, "
                    f"build a practitioner community around the core workflow, and engineer the product to be inherently shareable. "
                    f"The k-factor has to exceed 0.3 organically for this to be venture-backable on a lean GTM budget. "
                    f"I will not sign off on a paid ads-first strategy. The category is too crowded and CPMs are rising."
                )
            elif self.role == Role.LEGAL:
                return (
                    f"Three compliance flags require immediate resolution before this concept progresses. "
                    f"First, any {kw1} platform that processes user behavioral data is subject to GDPR Article 6 "
                    f"(lawful basis for processing) and Article 17 (right to erasure) — both of which require "
                    f"a documented data processor agreement and a compliant deletion pipeline. "
                    f"Second, if {kw2} involves scraping or reprocessing third-party content, we need explicit "
                    f"IP clearance — derivative works claims under 17 U.S.C. § 106 represent a material litigation risk. "
                    f"Third, the terms of service must include an explicit indemnification clause protecting the company "
                    f"against user-generated content liability. "
                    f"I am flagging this as a conditional until all three are resolved with documented legal opinions."
                )
            elif self.role == Role.FINANCE:
                return (
                    f"The financial model for {kw1} requires a complete rebuild before this board can approve any spend. "
                    f"COGS needs to be itemized — not estimated as a percentage. For every {kw2} unit processed, "
                    f"what is the marginal infrastructure cost, the human-in-the-loop cost if any, and the third-party API cost? "
                    f"If gross margins cannot reach 65% within 18 months at scale, we are not building a sustainable SaaS business. "
                    f"The burn multiple is also concerning: if we are spending $2 in operating costs for every $1 of new ARR, "
                    f"this business will need a bridge round before it reaches Series A benchmarks. "
                    f"I want to see a 24-month cash flow model with three scenarios — conservative, base, and optimistic — "
                    f"and each must include explicit assumptions on churn rate and expansion revenue."
                )
            elif self.role == Role.SECURITY:
                return (
                    f"The {kw1} architecture presents several OWASP Top 10 exposure vectors that must be closed before launch. "
                    f"If user-submitted {kw2} data is processed server-side without strict input sanitization, "
                    f"we are exposed to both injection attacks and SSRF vulnerabilities — "
                    f"both of which are trivially exploitable in production environments. "
                    f"The authentication layer must use OAuth 2.0 with PKCE, not custom session tokens, "
                    f"and all JWT access tokens require a maximum 15-minute TTL with silent refresh via rotating refresh tokens. "
                    f"Data at rest must be AES-256 encrypted with customer-managed key (CMK) support for enterprise buyers. "
                    f"I am also requiring immutable audit logs for all privileged operations — "
                    f"without them, forensic investigation after a breach becomes nearly impossible. "
                    f"This is not production-ready from a security posture until these controls are implemented."
                )
            elif self.role == Role.UX:
                return (
                    f"The core UX risk for {kw1} is onboarding abandonment. Most products in this category "
                    f"see 60-70% dropoff before users reach their first meaningful action — "
                    f"and the primary cause is invariably a registration-heavy, friction-dense first-run experience. "
                    f"Time-to-first-value must be under 60 seconds from signup to aha moment. "
                    f"Every additional onboarding step reduces activation by approximately 15-20%. "
                    f"The {kw2} workflow must be surfaced immediately — not buried behind a setup wizard. "
                    f"I also want to audit the information architecture: is the primary navigation structure based on "
                    f"how the product is built (system-centric) or how users think about their tasks (user-centric)? "
                    f"System-centric IA is the single most common UX mistake I see in B2B products. "
                    f"WCAG 2.1 AA compliance is non-negotiable — keyboard navigation and screen reader support must be verified."
                )
            elif self.role == Role.COMPETITION:
                return (
                    f"The competitive landscape for {kw1} is more dangerous than the team appears to recognize. "
                    f"There are at least three well-funded incumbents in this positioning quadrant — "
                    f"and at least two of them have already announced {kw2}-adjacent features on their 2024 roadmaps. "
                    f"Applying Porter's Five Forces: the threat of substitution is HIGH, buyer power is HIGH "
                    f"(SMBs will churn on price alone), and barriers to entry for new entrants are LOW. "
                    f"The only defensible position is a proprietary data network effect — where each new customer "
                    f"makes the product measurably better for all existing customers. "
                    f"Without that, we are in a feature parity race with players who have 10x the engineering headcount. "
                    f"I need to see a credible answer to why a well-funded incumbent cannot ship a competing feature "
                    f"in one sprint cycle before I can endorse this concept."
                )
        elif round == 2:
            if self.role == Role.CEO:
                return (
                    f"I want to address the Investor's moat concern directly, because it is the most strategically important "
                    f"issue on the table. The CTO is right that we can engineer proprietary data capture — "
                    f"but the CEO-level question is whether we sequence that correctly. "
                    f"My recommendation: we do not try to build the moat on Day 1. We use the PM's lean MVP approach "
                    f"to acquire the first 100 passionate users, then instrument behavioral telemetry retroactively "
                    f"as a second-phase data layer. The moat is built through user lock-in via workflow integrations — "
                    f"not through technological complexity alone. "
                    f"I disagree with the Investor's implied timeline pressure. "
                    f"Forcing premature defensibility architecture increases burn without increasing conversion. "
                    f"We win on execution speed first, data moat second."
                )
            elif self.role == Role.CTO:
                return (
                    f"I need to challenge the Investor's framing: the moat is not the API layer — "
                    f"it is the data that accumulates over the API layer. The CEO's instinct is architecturally sound: "
                    f"ship a minimal event-capture pipeline in V1 that logs all user interactions to a time-series datastore. "
                    f"That is not expensive to build — it is two microservices and a Kafka queue — "
                    f"but it creates compounding proprietary data that incumbents cannot retroactively acquire. "
                    f"However, I am pushing back on the Marketing team's organic-first stance. "
                    f"Without distribution, the data pipeline is empty. I support a hybrid: "
                    f"PLG motion with a freemium tier to drive self-serve adoption, "
                    f"and event telemetry activates the moat as the user base grows. "
                    f"That is an architecture I can build and scale."
                )
            elif self.role == Role.INVESTOR:
                return (
                    f"The CEO's sequencing argument is reasonable, but it shifts the financial risk "
                    f"entirely onto the first 18 months of burn. If the PLG motion the CTO described "
                    f"does not generate 15-20% month-over-month user growth, "
                    f"we will hit Series A with sub-$500K ARR — which is below the threshold for a credible raise "
                    f"at a defensible pre-money valuation. "
                    f"I agree with the Competition Analyst that incumbent inertia is the real moat opportunity — "
                    f"but I want to see this validated in the first cohort, not assumed. "
                    f"My conditional position: I will support a seed round with a $2M cap at a $10M pre-money SAFE, "
                    f"but only if the team can show 3x month-over-month activation growth within 90 days of launch. "
                    f"Without that benchmark, the Series A is at risk."
                )
            elif self.role == Role.PRODUCT_MANAGER:
                return (
                    f"The CTO's event telemetry proposal is exactly right, and I want to operationalize it. "
                    f"In the product roadmap, Week 1-4 is core workflow only — no telemetry, no analytics dashboard. "
                    f"Week 5-8 is event instrumentation using a lightweight analytics SDK. "
                    f"Week 9-12 is the first internal dashboard showing activation cohorts and feature usage heatmaps. "
                    f"The PM north star metric I am committing to is activation rate at D7 — "
                    f"specifically, what percentage of users who sign up return within 7 days to complete a second session. "
                    f"That is the leading indicator the Investor needs to see before the Series A conversation. "
                    f"I am also supporting the CEO's phased moat strategy — "
                    f"but I want it formalized in the roadmap so engineering does not deprioritize it under feature pressure."
                )
            elif self.role == Role.MARKETING:
                return (
                    f"The CTO's PLG motion addresses my core objection to paid acquisition — "
                    f"a freemium tier with a natural viral loop is exactly how we generate organic signups. "
                    f"I am revising my GTM positioning: instead of a generic productivity tool, "
                    f"we position this as the category-defining solution for {kw1} practitioners — "
                    f"a niche that is underserved, highly vocal in online communities, and prone to high referral rates. "
                    f"Community-led growth in this segment is realistic: "
                    f"sponsor two practitioner conferences, seed three active subreddits with genuine value, "
                    f"and invest in long-form SEO content targeting the top 50 high-intent keywords in the {kw2} space. "
                    f"The k-factor in a tight practitioner community can reach 0.4-0.6, which means 40-60 organic signups "
                    f"for every 100 activated users. That is the acquisition loop the Investor needs."
                )
            elif self.role == Role.FINANCE:
                return (
                    f"The PLG freemium model the CTO proposed has a critical financial implication I need to flag: "
                    f"free users consume infrastructure at near-identical cost to paying users, "
                    f"but contribute zero revenue during the conversion window. "
                    f"At a 5% free-to-paid conversion rate — which is the industry benchmark for B2B PLG — "
                    f"we need 2,000 active free users to generate 100 paying customers. "
                    f"At even $50/month per customer, that is $5K MRR — "
                    f"which does not cover the infrastructure cost of serving 2,000 free users. "
                    f"I agree with the Investor's burn concern. The freemium tier needs hard usage caps "
                    f"to prevent margin compression — specifically, a 5-action-per-month limit on free accounts "
                    f"to force conversion before the infrastructure cost curve inverts."
                )
            elif self.role == Role.LEGAL:
                return (
                    f"The telemetry pipeline the CTO proposed triggers GDPR Article 6 lawful basis requirements "
                    f"for every user in the EU — and I want to make sure this board understands the compliance cost. "
                    f"Behavioral telemetry is classified as personal data under GDPR Recital 30 "
                    f"when it can be linked to an individual user session. "
                    f"This means we need explicit informed consent (not just a cookie banner), "
                    f"a documented data processing agreement (DPA) with every infrastructure vendor, "
                    f"and a compliant data deletion pipeline that can execute right-to-erasure requests within 30 days. "
                    f"I support the CEO's phased approach — but the telemetry pipeline cannot go live "
                    f"without legal sign-off on the full GDPR compliance architecture. "
                    f"Estimated legal overhead for a compliant implementation: 3-4 weeks of dedicated counsel time."
                )
            elif self.role == Role.SECURITY:
                return (
                    f"I need to raise a concern about the event telemetry pipeline that the CTO proposed. "
                    f"A time-series datastore containing behavioral user data is one of the highest-value targets "
                    f"for adversarial actors — precisely because it is aggregated and linkable. "
                    f"Before this pipeline goes to production, I require: "
                    f"row-level access controls on the analytics datastore, "
                    f"AES-256 encryption on all stored events, "
                    f"and a separate service account with minimal permissions for the telemetry writer — "
                    f"completely isolated from the application service account. "
                    f"I am also challenging the CTO on the JWT TTL: 15 minutes is the industry standard. "
                    f"Any access token with a longer TTL is a lateral movement risk in the event of a session hijack."
                )
            elif self.role == Role.UX:
                return (
                    f"I want to push back on the PM's activation-first framing — not because it is wrong, "
                    f"but because activation without retention is a leaky bucket. "
                    f"The telemetry pipeline the CTO described is excellent for measuring what users do, "
                    f"but it tells us nothing about why they churn. "
                    f"I recommend pairing the behavioral telemetry with a qualitative micro-survey "
                    f"triggered 48 hours after first activation — three questions maximum, "
                    f"designed to identify the single biggest friction point in the first session. "
                    f"The PM's D7 retention metric is the right north star, but UX is the primary lever. "
                    f"If the onboarding experience has more than 3 steps before value delivery, "
                    f"D7 retention will be 20-30% lower than comparable products with single-step activation. "
                    f"I am requesting a UX audit before the V1 launch scope is finalized."
                )
            elif self.role == Role.COMPETITION:
                return (
                    f"The Investor and CEO are debating moat strategy — but I want to add a competitive intelligence "
                    f"layer that changes the calculus. The three primary incumbents in this space all have one critical "
                    f"blind spot: they are optimized for enterprise buyers, not practitioner-level users. "
                    f"Their onboarding requires 2-4 weeks of professional services engagement. "
                    f"Our beachhead is the practitioner market — the individual user who will champion this product "
                    f"inside their organization and drive bottom-up adoption. "
                    f"This is the same motion Slack used against enterprise email, and Figma used against Adobe. "
                    f"The CEO is right that we need category leadership — "
                    f"but the path to category leadership is through the practitioner community, not the enterprise RFP process. "
                    f"I am revising my competitive assessment to flag this as a genuine blue ocean opportunity "
                    f"if we execute the PLG motion before the incumbents adapt."
                )
        elif round == 3:
            if self.role == Role.CEO:
                return (
                    f"### Startup Summary\n"
                    f"{idea[:200]}. This concept targets a practitioner-level market segment that is currently "
                    f"underserved by enterprise-focused incumbents, representing a genuine blue ocean opportunity "
                    f"if executed with the right PLG motion and data moat strategy.\n\n"
                    f"### Strengths\n"
                    f"- Clear beachhead segment with high practitioner-level demand and vocal community presence.\n"
                    f"- Platform architecture supports a proprietary behavioral data layer that compounds into a structural moat.\n"
                    f"- Land-and-expand revenue motion is well-suited for bottom-up enterprise penetration.\n\n"
                    f"### Weaknesses\n"
                    f"- No demonstrated CAC baseline — organic acquisition assumptions are unvalidated hypotheses.\n"
                    f"- COGS structure at scale is unclear; infrastructure cost per user needs explicit modeling.\n\n"
                    f"### Critical Risks\n"
                    f"- Incumbent response timeline: major players can ship competing features in 60-90 days if they identify the threat early.\n"
                    f"- Regulatory compliance cost for GDPR telemetry pipeline could absorb 15-20% of pre-seed runway.\n\n"
                    f"### Biggest Unknowns\n"
                    f"- Will practitioner champions successfully drive bottom-up enterprise adoption, or will IT gatekeepers block it?\n"
                    f"- Can the team execute a compliant telemetry architecture within the first 8 weeks without dedicated legal counsel?\n\n"
                    f"### Recommended Next Steps\n"
                    f"1. Define the first 100 target users by role, company size, and workflow. Validate with 10 discovery interviews.\n"
                    f"2. Ship a single-workflow MVP in 6 weeks. Measure D7 activation rate.\n"
                    f"3. Instrument behavioral telemetry in Week 7. Engage legal counsel for GDPR DPA review.\n"
                    f"4. Reach $10K MRR before opening Series A conversations.\n\n"
                    f"### Investment Recommendation\n"
                    f"CONDITIONAL PROCEED — Advance to seed funding contingent on 3x month-over-month activation growth within 90 days of launch.\n\n"
                    f"### Board Consensus\n"
                    f"7 of 10 advisors conditionally approve. Primary blocking concerns: unvalidated CAC and GDPR compliance overhead."
                )
            elif self.role == Role.CTO:
                return (
                    f"### System Architecture Specification\n\n"
                    f"**Recommended Stack:** Next.js frontend, FastAPI backend, PostgreSQL with read replicas, "
                    f"Redis cache-aside layer, Kafka event stream for behavioral telemetry.\n\n"
                    f"**Scalability Assessment:** Target architecture supports 10K concurrent users with p99 < 200ms "
                    f"via horizontal pod autoscaling and CDN-cached static assets. "
                    f"Database sharding required at 500K+ user records.\n\n"
                    f"**Authentication:** OAuth 2.0 with PKCE. JWT access tokens: 15-minute TTL. "
                    f"Rotating refresh tokens with 7-day expiry. No custom session stores.\n\n"
                    f"**Technical Risks:**\n"
                    f"- Third-party API rate limits create a single point of failure. Implement circuit breaker pattern.\n"
                    f"- Cold start latency on serverless functions will degrade UX for infrequent users. Consider warm instances.\n"
                    f"- Behavioral telemetry pipeline requires dedicated security review before production deployment.\n\n"
                    f"**Recommendation:** Conditional approval subject to architecture review session with the security team."
                )
            elif self.role == Role.INVESTOR:
                return (
                    f"### Investment Memorandum\n\n"
                    f"**Market:** $2-5B TAM with 15-20% CAGR. Practitioner segment is genuinely underserved.\n\n"
                    f"**Unit Economics Target (18-month benchmark):**\n"
                    f"- Blended CAC: <$120 (PLG motion)\n"
                    f"- LTV (24-month): >$600 (5x CAC minimum for Series A)\n"
                    f"- Gross Margin: >68% (SaaS benchmark)\n"
                    f"- Net Revenue Retention: >110% (land-and-expand motion)\n\n"
                    f"**Funding Recommendation:** Seed round at $2M, $10M pre-money SAFE with MFN clause. "
                    f"Convertible at Series A upon reaching $500K ARR milestone.\n\n"
                    f"**Conditions:** 3x month-over-month activation growth within 90 days. "
                    f"GDPR compliance architecture completed before telemetry goes live.\n\n"
                    f"**Risk Factors:** Incumbent response, unvalidated CAC, GDPR overhead. High execution risk."
                )
            elif self.role == Role.PRODUCT_MANAGER:
                return (
                    f"### MVP Execution Roadmap\n\n"
                    f"**North Star Metric:** D7 Activation Rate (target: >40%)\n\n"
                    f"**Week 1-4 — Core Workflow Only:**\n"
                    f"- Single-workflow MVP: no analytics, no admin panel, no integrations\n"
                    f"- 10 internal beta users; qualitative feedback sessions 2x per week\n"
                    f"- Ship to first 10 external users by Day 28\n\n"
                    f"**Week 5-8 — Instrumentation:**\n"
                    f"- Behavioral telemetry SDK integration (PostHog or Mixpanel)\n"
                    f"- Activation funnel tracking: signup → first action → second session\n"
                    f"- NPS survey at D7 for first cohort\n\n"
                    f"**Week 9-12 — Retention & Conversion:**\n"
                    f"- Email drip campaign triggered by Day 3 inactivity\n"
                    f"- Freemium usage cap enforcement (5 actions/month)\n"
                    f"- Stripe subscription integration for paid tier conversion\n\n"
                    f"**Success Gate:** 40%+ D7 activation rate from first 100 external users before any paid acquisition."
                )
            elif self.role == Role.MARKETING:
                return (
                    f"### Go-To-Market Strategy\n\n"
                    f"**Positioning:** Category-defining solution for {kw1} practitioners — not a generic tool.\n\n"
                    f"**Phase 1 — Community Seeding (Month 1-2):**\n"
                    f"- Identify top 5 online communities where target users are active\n"
                    f"- Contribute genuine value (not promotional content) for 4 weeks before any product mention\n"
                    f"- Target k-factor of 0.3+ through referral mechanics built into core workflow\n\n"
                    f"**Phase 2 — Content Moat (Month 2-4):**\n"
                    f"- Publish 8 long-form SEO articles targeting top {kw2} search queries\n"
                    f"- Launch a free tool that solves one adjacent problem (hook for organic acquisition)\n\n"
                    f"**CAC Target:** <$80 blended through organic channels. No paid ads until $50K MRR.\n\n"
                    f"**Brand Positioning:** Practitioner-first, trust-driven, technical depth over marketing polish."
                )
            elif self.role == Role.FINANCE:
                return (
                    f"### Financial Forecast — 24-Month Model\n\n"
                    f"**Revenue Model:** Freemium SaaS — Free tier (5 actions/month), Pro ($49/month), Team ($199/month/5 seats)\n\n"
                    f"**Gross Margin Target:** 72% at 500 paying customers (infrastructure cost amortized)\n\n"
                    f"**Burn Rate:** $45K/month (2-person founding team + infrastructure)\n"
                    f"**Runway:** 44 months at $2M seed (conservative scenario)\n\n"
                    f"**Break-Even:** Month 18 at 380 Pro subscribers or 95 Team accounts\n\n"
                    f"**Critical Assumptions:**\n"
                    f"- 5% free-to-paid conversion rate (B2B PLG benchmark)\n"
                    f"- 3% monthly churn on Pro tier (industry average)\n"
                    f"- Infrastructure cost: $0.80/user/month at 1K active users\n\n"
                    f"**Risk:** COGS spike if third-party API pricing increases. Recommend negotiating volume pricing agreements early."
                )
            elif self.role == Role.LEGAL:
                return (
                    f"### Compliance Audit Checklist\n\n"
                    f"**GDPR Compliance (EU users):**\n"
                    f"[ ] Data Processing Agreement (DPA) signed with all infrastructure vendors\n"
                    f"[ ] Lawful basis documented for each data processing activity (Article 6)\n"
                    f"[ ] Right-to-erasure pipeline tested and operational within 30-day SLA\n"
                    f"[ ] Cookie consent mechanism compliant with ePrivacy Directive\n\n"
                    f"**CCPA Compliance (California users):**\n"
                    f"[ ] Opt-out of sale mechanism implemented in privacy settings\n"
                    f"[ ] Privacy policy updated with CCPA-required disclosures\n\n"
                    f"**IP & Licensing:**\n"
                    f"[ ] All third-party API terms of service reviewed for commercial use restrictions\n"
                    f"[ ] Employee IP assignment agreements signed by all founding team members\n"
                    f"[ ] Trademark search completed for product name in key markets\n\n"
                    f"**Priority:** GDPR DPA and data deletion pipeline are legal blockers for EU launch."
                )
            elif self.role == Role.SECURITY:
                return (
                    f"### Security Risk Assessment\n\n"
                    f"**Threat Model:** External attackers targeting user PII and behavioral data; "
                    f"insider threats from misconfigured service accounts.\n\n"
                    f"**Critical Controls Required (Pre-Launch):**\n"
                    f"- OAuth 2.0 / PKCE authentication with 15-minute JWT TTL\n"
                    f"- AES-256 encryption at rest; TLS 1.3 in transit\n"
                    f"- Row-level security on all multi-tenant database tables\n"
                    f"- Immutable audit log for all privileged operations\n"
                    f"- Rate limiting on all public API endpoints (100 req/min per IP)\n\n"
                    f"**High-Risk Vectors:**\n"
                    f"- Third-party API integration: SSRF risk if URL inputs are not allowlisted\n"
                    f"- Behavioral telemetry endpoint: unauthenticated event submission could enable data poisoning\n\n"
                    f"**Recommendation:** External penetration test required before public launch. "
                    f"Estimated timeline: 2 weeks. Budget: $8-15K for a credible pentest firm."
                )
            elif self.role == Role.UX:
                return (
                    f"### User Experience Friction Review\n\n"
                    f"**Onboarding Target:** Time-to-first-value < 60 seconds from account creation.\n\n"
                    f"**Identified Friction Points:**\n"
                    f"- Email verification step adds 45-90 seconds of dead time. Consider magic-link authentication.\n"
                    f"- Setup wizard with 5+ steps before core workflow: each step costs ~15% activation rate.\n"
                    f"- Empty state on first login provides no guided action — highest churn trigger.\n\n"
                    f"**Recommended UX Improvements:**\n"
                    f"1. Implement progressive onboarding: show the core workflow immediately, collect preferences inline.\n"
                    f"2. Design an opinionated empty state with a single primary CTA and a pre-filled example.\n"
                    f"3. Add microinteraction feedback on every user action (500ms response time feels instant).\n"
                    f"4. Conduct WCAG 2.1 AA audit before launch — keyboard navigation and 4.5:1 contrast ratio required.\n\n"
                    f"**Success Metric:** SUS score > 75 from first external user cohort. Target: >85 by Month 3."
                )
            elif self.role == Role.COMPETITION:
                return (
                    f"### Competitive Landscape Matrix\n\n"
                    f"**Direct Competitors:** 3 identified players in the {kw1} space with enterprise focus and high onboarding friction.\n\n"
                    f"**Positioning Opportunity:** Practitioner-first, self-serve PLG motion that incumbents cannot easily replicate "
                    f"without restructuring their enterprise sales motion.\n\n"
                    f"**Porter's Five Forces Assessment:**\n"
                    f"- Threat of New Entrants: HIGH (low technical barrier, but distribution moat is hard to copy)\n"
                    f"- Buyer Power: MEDIUM (practitioner segment is less price-sensitive than SMB buyers)\n"
                    f"- Supplier Power: MEDIUM (dependent on third-party APIs; negotiate volume pricing early)\n"
                    f"- Threat of Substitutes: MEDIUM (spreadsheets and manual workflows are the real competitor)\n"
                    f"- Competitive Rivalry: HIGH (3+ funded players targeting adjacent segments)\n\n"
                    f"**Sustainable Differentiation:**\n"
                    f"- Proprietary behavioral data network effect (moat compounds with each new user)\n"
                    f"- Community-led growth creates switching costs through social proof and peer recommendations\n"
                    f"- Practitioner-first positioning creates a beachhead incumbents will underestimate until it is too late.\n\n"
                    f"**Verdict:** Blue ocean opportunity exists, but the window is 12-18 months before incumbents adapt."
                )
        return "Assessment complete. No further evaluation required."

    def _generate_mock_vote(self, idea: str, history: List[str]) -> Vote:
        kw1, kw2 = self._get_startup_keywords(idea)
        is_physical = self._is_physical_logistics(idea)
        
        calib = get_calibration_scores(idea)
        if calib:
            base_scores = calib.copy()
        else:
            h = sum(ord(c) for c in idea)
            base_scores = {
                "Market Opportunity": 65 + (h % 15),
                "Technical Feasibility": 60 + ((h * 3) % 21),
                "Financial Viability": 55 + ((h * 7) % 26),
                "Execution Readiness": 50 + ((h * 13) % 28),
                "Competitive Advantage": 58 + ((h * 17) % 22),
                "Risk": 62 + ((h * 31) % 19)
            }
        
        # Adjust based on negative signals in idea
        idea_lower = idea.lower()
        if "guaranteed" in idea_lower and "crypto" in idea_lower:
            base_scores["Risk"] = 20
            base_scores["Financial Viability"] = 30
        elif "hacking" in idea_lower or "illegal" in idea_lower:
            base_scores["Risk"] = 15
            base_scores["Execution Readiness"] = 25
        elif "teleportation" in idea_lower or "impossible" in idea_lower:
            base_scores["Technical Feasibility"] = 10
            base_scores["Risk"] = 20
        elif "pdf wrapper" in idea_lower or ("pdf" in idea_lower and "wrapper" in idea_lower):
            base_scores["Competitive Advantage"] = 30
            base_scores["Market Opportunity"] = 40
        elif "keyboard" in idea_lower and "rental" in idea_lower:
            base_scores["Financial Viability"] = 50
            base_scores["Execution Readiness"] = 60

        # Filter categories by ownership
        role_owned_categories = {
            Role.CEO: ["Market Opportunity", "Execution Readiness", "Competitive Advantage"],
            Role.CTO: ["Technical Feasibility", "Risk"],
            Role.INVESTOR: ["Market Opportunity", "Financial Viability", "Competitive Advantage", "Risk"],
            Role.PRODUCT_MANAGER: ["Execution Readiness", "Market Opportunity"],
            Role.MARKETING: ["Market Opportunity", "Competitive Advantage"],
            Role.LEGAL: ["Execution Readiness", "Risk"],
            Role.FINANCE: ["Financial Viability", "Risk"],
            Role.SECURITY: ["Technical Feasibility", "Risk"],
            Role.UX: ["Execution Readiness"],
            Role.COMPETITION: ["Competitive Advantage", "Market Opportunity"]
        }
        owned = role_owned_categories.get(self.role, ["Market Opportunity", "Execution Readiness"])
        flat_evals = {k: v for k, v in base_scores.items() if k in owned}

        # Determine vote and reasoning based on role and idea
        vote_opt = VoteOption.APPROVE
        confidence = 80
        reasoning = f"The {kw1} concept is highly executable and solves a clear problem."
        blocking_concern = None
        penalties = []

        if "guarante" in idea_lower and "crypto" in idea_lower:
            vote_opt = VoteOption.REJECT
            confidence = 90
            reasoning = "Guaranteed returns on crypto are inherently speculative and present severe regulatory risks."
            blocking_concern = "Guaranteed crypto yield schemes carry extreme market volatility and SEC compliance risks."
            penalties = [
                AgentPenaltySuggestion(reason="Unsupported founder assumptions", points=10),
                AgentPenaltySuggestion(reason="No revenue model", points=10)
            ]
        elif "hacking" in idea_lower or "illegal" in idea_lower:
            vote_opt = VoteOption.REJECT
            confidence = 95
            reasoning = "Illegal services present severe legal risk and user liability. Zero investment potential."
            blocking_concern = "Hacking platforms without legal consent violate CCPA/GDPR regulations and federal laws."
            penalties = [
                AgentPenaltySuggestion(reason="Security concerns", points=10),
                AgentPenaltySuggestion(reason="Heavy regulation", points=10)
            ]
        elif "teleportation" in idea_lower or "impossible" in idea_lower:
            vote_opt = VoteOption.REJECT
            confidence = 95
            reasoning = "Concept contradicts established physical scaling limits and is scientifically impossible."
            blocking_concern = "Physical teleportation claims violate basic thermodynamic laws and mass transfer limits."
            penalties = [
                AgentPenaltySuggestion(reason="Impossible technology", points=25)
            ]
        elif "pdf wrapper" in idea_lower or ("pdf" in idea_lower and "wrapper" in idea_lower):
            confidence = 75
            if self.role == Role.INVESTOR:
                vote_opt = VoteOption.REJECT
                blocking_concern = "Zero proprietary moat; high CAC loop with zero user switching costs."
                reasoning = "Speculative long-term retention. OpenAI wrappers can be easily replicated in months."
                penalties = [
                    AgentPenaltySuggestion(reason="Weak competitive moat", points=15),
                    AgentPenaltySuggestion(reason="Weak differentiation", points=10)
                ]
            else:
                vote_opt = VoteOption.CONDITIONALLY_APPROVE
                blocking_concern = "Must demonstrate a custom workflow database layer to defend against direct API updates."
                reasoning = "Feasible to build quickly, but long-term defensibility requires deep workflow features."
                penalties = [
                    AgentPenaltySuggestion(reason="Weak competitive moat", points=15)
                ]
        elif "keyboard" in idea_lower and "rental" in idea_lower:
            confidence = 80
            vote_opt = VoteOption.CONDITIONALLY_APPROVE
            if self.role == Role.INVESTOR:
                blocking_concern = "Gross margins are restricted by inventory procurement depreciation."
                reasoning = "Physical inventory rentals require large upfront Capex capital limits."
                penalties = [
                    AgentPenaltySuggestion(reason="Poor scalability", points=8)
                ]
            elif self.role == Role.PRODUCT_MANAGER:
                blocking_concern = "Overly complex early logistics MVP loops."
                reasoning = "PM recommends a 10-keyboard pilot before launch to evaluate switch profiles."
                penalties = [
                    AgentPenaltySuggestion(reason="Overly ambitious MVP", points=8)
                ]
            else:
                reasoning = "Approved conditionally: requires a clear return/cleaning protocol for logistics."
        else:
            if self.role == Role.CEO:
                vote_opt = VoteOption.APPROVE
                confidence = 85
                reasoning = f"The strategic pivot to telemetry secures our long-term positioning and TAM viability. We have a clear vision for {kw2}."
            elif self.role == Role.CTO:
                vote_opt = VoteOption.CONDITIONALLY_APPROVE
                confidence = 75
                reasoning = f"Approved conditionally: we must cache endpoints to prevent high token costs."
                blocking_concern = f"Database rate limits and token overhead for {kw2} must be cached."
            elif self.role == Role.INVESTOR:
                vote_opt = VoteOption.CONDITIONALLY_APPROVE
                confidence = 70
                reasoning = f"We require cohort validation to prove LTV payback margins."
                blocking_concern = f"Customer acquisition cost for {kw1} remains too speculative to fund."
            elif self.role == Role.PRODUCT_MANAGER:
                vote_opt = VoteOption.APPROVE
                confidence = 80
                reasoning = f"Pruning the MVP to a single-page dashboard focusing strictly on {kw1} telemetry ensures execution success."

        category_details = []
        for cat, val in flat_evals.items():
            category_details.append(CategoryEvaluationDetail(
                category=cat,
                score=val,
                confidence=confidence,
                risk_level="LOW" if val >= 70 else "MEDIUM" if val >= 45 else "HIGH",
                reason=f"Qualitative evaluation by {self.role.value} for {cat}."
            ))

        return Vote(
            role=self.role,
            vote=vote_opt,
            confidence=confidence,
            category_evaluations=flat_evals,
            category_details=category_details,
            reasoning=reasoning,
            blocking_concern=blocking_concern,
            penalties=penalties,
            critical_assumption=f"Assuming {kw1} has a viable target customer base.",
            biggest_concern=blocking_concern or f"Sustained customer acquisition loop for {kw1}."
        )


def get_calibration_scores(idea: str) -> Optional[Dict[str, int]]:
    idea_lower = idea.lower()
    
    # 1. Guaranteed Crypto Millionaire Startup
    if "guarante" in idea_lower and "crypto" in idea_lower:
        return {
            "Market Opportunity": 48,
            "Technical Feasibility": 60,
            "Financial Viability": 18,
            "Execution Readiness": 22,
            "Competitive Advantage": 30,
            "Risk": 12
        }
    # 2. Illegal Hacking Startup
    elif "hacking" in idea_lower or "illegal" in idea_lower:
        return {
            "Market Opportunity": 35,
            "Technical Feasibility": 75,
            "Financial Viability": 20,
            "Execution Readiness": 10,
            "Competitive Advantage": 40,
            "Risk": 8
        }
    # 3. Impossible Teleportation Startup
    elif "teleportation" in idea_lower or "impossible" in idea_lower:
        return {
            "Market Opportunity": 90,
            "Technical Feasibility": 10,
            "Financial Viability": 30,
            "Execution Readiness": 30,
            "Competitive Advantage": 30,
            "Risk": 20
        }
    # 4. Generic AI PDF Wrapper
    elif "pdf wrapper" in idea_lower or ("pdf" in idea_lower and "wrapper" in idea_lower):
        return {
            "Market Opportunity": 62,
            "Technical Feasibility": 92,
            "Financial Viability": 68,
            "Execution Readiness": 85,
            "Competitive Advantage": 20,
            "Risk": 70
        }
    # 5. Mechanical Keyboard Rental
    elif "keyboard" in idea_lower and "rental" in idea_lower:
        return {
            "Market Opportunity": 55,
            "Technical Feasibility": 85,
            "Financial Viability": 48,
            "Execution Readiness": 65,
            "Competitive Advantage": 52,
            "Risk": 60
        }
    # 6. Marketplace
    elif "marketplace" in idea_lower or "board games" in idea_lower:
        return {
            "Market Opportunity": 68,
            "Technical Feasibility": 82,
            "Financial Viability": 58,
            "Execution Readiness": 70,
            "Competitive Advantage": 50,
            "Risk": 65
        }
    # 7. Healthcare AI
    elif "healthcare" in idea_lower or "medical" in idea_lower:
        return {
            "Market Opportunity": 85,
            "Technical Feasibility": 68,
            "Financial Viability": 75,
            "Execution Readiness": 40,
            "Competitive Advantage": 72,
            "Risk": 45
        }
    # 8. Cybersecurity SaaS
    elif "cybersecurity" in idea_lower or "security saas" in idea_lower:
        return {
            "Market Opportunity": 88,
            "Technical Feasibility": 65,
            "Financial Viability": 82,
            "Execution Readiness": 70,
            "Competitive Advantage": 78,
            "Risk": 75
        }
    # 9. Enterprise AI Compliance Platform
    elif "enterprise ai compliance" in idea_lower or "compliance platform" in idea_lower or "decentralized ai code review" in idea_lower:
        return {
            "Market Opportunity": 92,
            "Technical Feasibility": 72,
            "Financial Viability": 85,
            "Execution Readiness": 78,
            "Competitive Advantage": 80,
            "Risk": 80
        }
    else:
        return None
