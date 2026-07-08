from fastapi import FastAPI, Depends, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from typing import List, Optional
import json
import logging

from .config import settings
from .schemas.session import BoardroomSession, Role, SessionState
from .database.repository import SessionRepository
from .database.memory_db import InMemorySessionRepository
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
    allow_origins=["*"],  # In production, specify Vercel domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Repository singleton injection provider
_repository_singleton = InMemorySessionRepository()

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
                # Standard SSE format: "event: [name]\ndata: [json]\n\n"
                yield f"event: {event['event']}\ndata: {json.dumps(event['data'])}\n\n"
        except Exception as e:
            logger.error(f"Stream error for session {session_id}: {e}")
            yield f"event: status\ndata: {json.dumps({'session_id': session_id, 'state': SessionState.FAILED, 'message': f'Error: {str(e)}'})}\n\n"

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
