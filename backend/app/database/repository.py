from abc import ABC, abstractmethod
from typing import List, Optional
from ..schemas.session import BoardroomSession

class SessionRepository(ABC):
    @abstractmethod
    async def get_session(self, session_id: str) -> Optional[BoardroomSession]:
        """Retrieve a session by its ID."""
        pass

    @abstractmethod
    async def save_session(self, session: BoardroomSession) -> BoardroomSession:
        """Create or update a boardroom session."""
        pass

    @abstractmethod
    async def list_sessions(self) -> List[BoardroomSession]:
        """List all active or past boardroom sessions."""
        pass

    @abstractmethod
    async def delete_session(self, session_id: str) -> bool:
        """Delete a session by ID."""
        pass
