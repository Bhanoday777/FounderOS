import pytest
from app.schemas.session import Role, VoteOption, Vote
from app.core.agent import BoardAgent

@pytest.mark.asyncio
async def test_board_agent_personas_setup():
    """Verify that personas are initialized with non-empty system prompts."""
    for role in [Role.CEO, Role.CTO, Role.INVESTOR, Role.PRODUCT_MANAGER]:
        agent = BoardAgent(role=role)
        assert agent.role == role
        assert len(agent.persona) > 0
        assert "board" in agent.persona.lower() or role.value in agent.persona

@pytest.mark.asyncio
async def test_board_agent_opinion_fallback():
    """Verify that BoardAgent generate_opinion works under mock fallback."""
    agent = BoardAgent(role=Role.CTO)
    idea = "A decentralized AI code review platform"
    history = []
    
    opinion = await agent.generate_opinion(idea, history, round=1)
    assert len(opinion) > 0
    assert "CTO" in opinion or "stack" in opinion or "scaling" in opinion

@pytest.mark.asyncio
async def test_board_agent_vote_fallback():
    """Verify that BoardAgent cast_vote returns a valid structured Vote model."""
    agent = BoardAgent(role=Role.INVESTOR)
    idea = "A decentralized AI code review platform"
    history = ["CEO: We have strong interest.", "CTO: The stack is simple."]
    
    vote = await agent.cast_vote(idea, history)
    assert isinstance(vote, Vote)
    assert vote.role == Role.INVESTOR
    assert vote.vote in [VoteOption.APPROVE, VoteOption.CONDITIONALLY_APPROVE, VoteOption.REJECT]
    assert 0 <= vote.confidence <= 100
    assert vote.category_evaluations is not None
    assert any("Market" in k for k in vote.category_evaluations)
    assert len(vote.reasoning) > 0
