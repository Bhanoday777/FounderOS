from enum import Enum
from typing import List, Dict, Optional
from pydantic import BaseModel, Field
import time

class Role(str, Enum):
    CEO = "CEO"
    CTO = "CTO"
    INVESTOR = "Investor"
    PRODUCT_MANAGER = "Product Manager"
    MARKETING = "Marketing Strategist"
    LEGAL = "Legal Advisor"
    FINANCE = "Finance Advisor"
    SECURITY = "Security Architect"
    UX = "UX Advisor"
    COMPETITION = "Competition Analyst"

class VoteOption(str, Enum):
    APPROVE = "APPROVE"
    CONDITIONALLY_APPROVE = "CONDITIONALLY_APPROVE"
    REJECT = "REJECT"

class CategoryEvaluationDetail(BaseModel):
    category: str
    score: int = Field(..., ge=0, le=100)
    confidence: int = Field(..., ge=0, le=100)
    risk_level: str = Field(..., description="LOW, MEDIUM, or HIGH")
    reason: str

class AgentPenaltySuggestion(BaseModel):
    reason: str
    points: int

class Vote(BaseModel):
    role: Role
    vote: VoteOption
    confidence: int = Field(..., ge=0, le=100, description="Confidence score from 0 to 100")
    category_evaluations: Dict[str, int] = Field(
        default_factory=dict,
        description="Scores between 0 and 100 for keys: Innovation, Execution, Market, Financial, Technology, Competition"
    )
    category_details: List[CategoryEvaluationDetail] = Field(default_factory=list)
    reasoning: str
    blocking_concern: Optional[str] = Field(default=None, description="Critical blocking concern if voting REJECT or CONDITIONALLY_APPROVE")
    penalties: List[AgentPenaltySuggestion] = Field(default_factory=list)

class DebateTurn(BaseModel):
    id: str
    role: Role
    round: int = Field(..., description="1 = Initial reaction, 2 = Cross-debate response")
    content: str
    timestamp: float = Field(default_factory=time.time)

class SessionState(str, Enum):
    INITIALIZED = "INITIALIZED"
    ROUND_1_ANALYSIS = "ROUND_1_ANALYSIS"
    ROUND_2_DEBATE = "ROUND_2_DEBATE"
    VOTING = "VOTING"
    SYNTHESIS = "SYNTHESIS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class StartupHealthScore(BaseModel):
    overall_score: int = Field(..., ge=0, le=100)
    approval_ratio: float = Field(..., ge=0.0, le=1.0)
    average_confidence: float = Field(..., ge=0.0, le=100.0)
    category_scores: Dict[str, int] = Field(
        default_factory=dict,
        description="Aggregated deterministic scores for Innovation, Execution, Market, Financial, Technology, Competition"
    )
    score_explanations: Dict[str, str] = Field(default_factory=dict)
    agent_votes: Dict[Role, VoteOption]
    explainable_scores: Dict[str, CategoryEvaluationDetail] = Field(
        default_factory=dict,
        description="Detailed explainable score breakdown for Innovation, Technology, Market, Financial, Competition, Execution, and Overall Health"
    )
    penalties: List[Dict[str, str | int]] = Field(default_factory=list, description="Aggregated applied penalties for transparency")

class SynthesisResult(BaseModel):
    executive_summary: str = "" # CEO
    architecture: str = "" # CTO
    investment_memo: str = "" # Investor
    roadmap: List[str] = Field(default_factory=list) # PM
    go_to_market: str = "" # Marketing
    financial_report: str = "" # Finance
    compliance_checklist: List[str] = Field(default_factory=list) # Legal
    security_assessment: str = "" # Security
    ux_review: str = "" # UX
    competitive_landscape: str = "" # Competition

class BoardroomSession(BaseModel):
    id: str
    idea: str
    active_agents: List[Role]
    state: SessionState = SessionState.INITIALIZED
    turns: List[DebateTurn] = []
    votes: List[Vote] = []
    health_score: Optional[StartupHealthScore] = None
    synthesis: Optional[SynthesisResult] = None
    created_at: float = Field(default_factory=time.time)
    updated_at: float = Field(default_factory=time.time)
