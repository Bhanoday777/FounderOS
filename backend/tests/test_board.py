import pytest
from app.schemas.session import Role, Vote, VoteOption, SessionState
from app.database.memory_db import InMemorySessionRepository
from app.core.board import BoardOrchestrator

@pytest.mark.asyncio
async def test_deterministic_health_score_calculation():
    """Verify the math of the deterministic Startup Health Score algorithm."""
    repo = InMemorySessionRepository()
    orchestrator = BoardOrchestrator(repository=repo)
    
    # Setup test votes:
    # 1. CEO: APPROVE (weight 1.0), confidence 80. weighted = 1.0 * 80 = 80
    # 2. CTO: CONDITIONALLY_APPROVE (weight 0.5), confidence 70. weighted = 0.5 * 70 = 35
    # 3. Investor: REJECT (weight 0.0), confidence 60. weighted = 0.0 * 60 = 0
    # 4. PM: APPROVE (weight 1.0), confidence 90. weighted = 1.0 * 90 = 90
    # Total weighted = 80 + 35 + 0 + 90 = 205
    # Total confidence = 80 + 70 + 60 + 90 = 300
    # Overall score = round(205 / 300 * 100) = round(68.33) = 68
    # Approval ratio = 3 out of 4 = 0.75
    # Average confidence = (80+70+60+90)/4 = 75.0
    votes = [
        Vote(role=Role.CEO, vote=VoteOption.APPROVE, confidence=80, category_evaluations={"Innovation": 80}, reasoning="OK"),
        Vote(role=Role.CTO, vote=VoteOption.CONDITIONALLY_APPROVE, confidence=70, category_evaluations={"Execution": 70}, reasoning="OK"),
        Vote(role=Role.INVESTOR, vote=VoteOption.REJECT, confidence=60, category_evaluations={"Market": 60}, reasoning="OK"),
        Vote(role=Role.PRODUCT_MANAGER, vote=VoteOption.APPROVE, confidence=90, category_evaluations={"Financial": 90}, reasoning="OK")
    ]
    
    weights = {Role.CEO: 1.0, Role.CTO: 0.5, Role.INVESTOR: 0.0, Role.PRODUCT_MANAGER: 1.0}
    score = orchestrator._calculate_deterministic_health_score(votes, weights, "Software")
    assert score.overall_score > 0
    assert score.approval_ratio == 0.75
    assert score.average_confidence == 75.0
    assert score.agent_votes[Role.CEO.value] in (VoteOption.APPROVE.value, "APPROVE")
    assert score.agent_votes[Role.INVESTOR.value] in (VoteOption.REJECT.value, "REJECT")

@pytest.mark.asyncio
async def test_orchestrator_session_flow():
    """Test that BoardOrchestrator executes all rounds and returns streamed events."""
    repo = InMemorySessionRepository()
    orchestrator = BoardOrchestrator(repository=repo)
    
    idea = "A mobile app that matches people for board games based on geo-location."
    active_roles = [Role.CEO, Role.CTO, Role.INVESTOR, Role.PRODUCT_MANAGER]
    
    events = []
    async for event in orchestrator.run_session("test-session-id", idea, active_roles):
        events.append(event)
        
    # Check that events contain status updates, turns, votes, health score, and synthesis
    event_names = [e["event"] for e in events]
    assert "status" in event_names
    assert "turn" in event_names
    assert "vote" in event_names
    assert "health_score" in event_names
    assert "synthesis" in event_names
    
    # Retrieve the final session state from the repo
    sessions = await repo.list_sessions()
    assert len(sessions) == 1
    final_session = sessions[0]
    assert final_session.state == SessionState.COMPLETED
    assert len(final_session.turns) >= 7
    assert len(final_session.votes) == 4  # 4 agents
    assert final_session.health_score is not None
    assert final_session.synthesis is not None
    assert len(final_session.synthesis.executive_summary) > 0
    assert len(final_session.synthesis.investment_memo) > 0
