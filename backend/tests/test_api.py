import pytest
from fastapi.testclient import TestClient
from app.main import app, get_repository
from app.database.memory_db import InMemorySessionRepository
from app.schemas.session import Role, SessionState

# Reset repository for each API test
@pytest.fixture
def test_client():
    repo = InMemorySessionRepository()
    app.dependency_overrides[get_repository] = lambda: repo
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()

def test_root_endpoint(test_client):
    response = test_client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"
    assert "project" in response.json()

def test_create_session(test_client):
    payload = {
        "idea": "An AI platform that reads user expressions to suggest music.",
        "active_agents": [Role.CEO.value, Role.CTO.value, Role.INVESTOR.value]
    }
    response = test_client.post("/api/board/session", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["idea"] == payload["idea"]
    assert len(data["active_agents"]) == 3
    assert data["state"] == SessionState.INITIALIZED.value

def test_get_and_delete_session(test_client):
    # First, create a session
    payload = {
        "idea": "An AI platform that reads user expressions to suggest music."
    }
    create_resp = test_client.post("/api/board/session", json=payload)
    session_id = create_resp.json()["id"]

    # Get session
    get_resp = test_client.get(f"/api/board/session/{session_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == session_id

    # List all sessions
    list_resp = test_client.get("/api/board/sessions")
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1

    # Delete session
    del_resp = test_client.delete(f"/api/board/session/{session_id}")
    assert del_resp.status_code == 200
    
    # Verify 404 on get
    get_resp_404 = test_client.get(f"/api/board/session/{session_id}")
    assert get_resp_404.status_code == 404

def test_stream_session_route(test_client):
    # Create session
    payload = {
        "idea": "An AI platform that reads user expressions to suggest music.",
        "active_agents": [Role.CEO.value, Role.CTO.value]
    }
    create_resp = test_client.post("/api/board/session", json=payload)
    session_id = create_resp.json()["id"]

    # Fetch SSE stream (limit reading to check it connects and starts streaming events)
    with test_client.stream("GET", f"/api/board/session/{session_id}/stream") as response:
        assert response.status_code == 200
        assert "text/event-stream" in response.headers["content-type"]
        
        # Read the first few lines of the stream
        lines = []
        for line in response.iter_lines():
            if line:
                lines.append(line)
            if len(lines) >= 3:
                break
        
        assert len(lines) > 0
        # The first event is usually status
        assert any("event: status" in l or "event: turn" in l for l in lines)
