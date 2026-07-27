import pytest
import os
from app.schemas.session import Role, Vote, VoteOption, SessionState
from app.database.memory_db import InMemorySessionRepository
from app.database.sqlite_db import SQLiteSessionRepository
from app.core.board import BoardOrchestrator

@pytest.mark.asyncio
async def test_deterministic_health_score_calculation():
    """Verify the math of the deterministic Startup Health Score algorithm."""
    repo = InMemorySessionRepository()
    orchestrator = BoardOrchestrator(repository=repo)
    
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
        
    event_names = [e["event"] for e in events]
    assert "status" in event_names
    assert "turn" in event_names
    assert "vote" in event_names
    assert "health_score" in event_names
    assert "synthesis" in event_names
    
    sessions = await repo.list_sessions()
    assert len(sessions) == 1
    final_session = sessions[0]
    assert final_session.state == SessionState.COMPLETED

@pytest.mark.asyncio
async def test_sqlite_orchestrator_session_flow():
    """Verify that BoardOrchestrator works correctly with the persistent SQLite backend."""
    db_path = "test_boardroom.db"
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except Exception:
            pass
        
    try:
        repo = SQLiteSessionRepository(db_path=db_path)
        orchestrator = BoardOrchestrator(repository=repo)
        
        idea = "A geo-fenced delivery network using autonomous e-bikes."
        active_roles = [Role.CEO, Role.CTO, Role.INVESTOR]
        
        events = []
        async for event in orchestrator.run_session("test-sqlite-session", idea, active_roles):
            events.append(event)
            
        sessions = await repo.list_sessions()
        assert len(sessions) == 1
        final_session = sessions[0]
        assert final_session.state == SessionState.COMPLETED
        assert len(final_session.turns) >= 5
        assert len(final_session.votes) == 3
        assert final_session.health_score is not None
    finally:
        if os.path.exists(db_path):
            try:
                os.remove(db_path)
            except Exception:
                pass
