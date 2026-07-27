import sqlite3
import json
import time
from typing import List, Optional
from .repository import SessionRepository
from ..schemas.session import BoardroomSession

class SQLiteSessionRepository(SessionRepository):
    def __init__(self, db_path: str = "boardroom.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    data TEXT NOT NULL,
                    updated_at REAL NOT NULL
                )
            """)
            conn.commit()

    async def get_session(self, session_id: str) -> Optional[BoardroomSession]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT data FROM sessions WHERE id = ?", (session_id,))
            row = cursor.fetchone()
            if row:
                return BoardroomSession.model_validate_json(row[0])
        return None

    async def save_session(self, session: BoardroomSession) -> BoardroomSession:
        session.updated_at = time.time()
        session_json = session.model_dump_json()
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "INSERT OR REPLACE INTO sessions (id, data, updated_at) VALUES (?, ?, ?)",
                (session.id, session_json, session.updated_at)
            )
            conn.commit()
        return session

    async def list_sessions(self) -> List[BoardroomSession]:
        sessions_list = []
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT data FROM sessions ORDER BY updated_at DESC")
            rows = cursor.fetchall()
            for row in rows:
                sessions_list.append(BoardroomSession.model_validate_json(row[0]))
        return sessions_list

    async def delete_session(self, session_id: str) -> bool:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
            conn.commit()
            return cursor.rowcount > 0
