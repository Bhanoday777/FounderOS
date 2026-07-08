from typing import List, Optional, Dict
from .repository import SessionRepository
from ..schemas.session import BoardroomSession
import time

class InMemorySessionRepository(SessionRepository):
    def __init__(self):
        self._sessions: Dict[str, BoardroomSession] = {}

    async def get_session(self, session_id: str) -> Optional[BoardroomSession]:
        session = self._sessions.get(session_id)
        if session:
            # Return a copy to avoid external mutations affecting the repo directly
            return BoardroomSession.model_validate(session.model_dump())
        return None

    async def save_session(self, session: BoardroomSession) -> BoardroomSession:
        session.updated_at = time.time()
        # Save a serialized copy to persist snapshots
        self._sessions[session.id] = BoardroomSession.model_validate(session.model_dump())
        return session

    async def list_sessions(self) -> List[BoardroomSession]:
        return [BoardroomSession.model_validate(s.model_dump()) for s in self._sessions.values()]

    async def delete_session(self, session_id: str) -> bool:
        if session_id in self._sessions:
            del self._sessions[session_id]
            return True
        return False
