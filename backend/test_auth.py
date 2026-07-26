"""
Auth API tests (Google OAuth).

Maps to the Login cases in our system-testing checklist:
  - valid credential → user payload returned (client redirects home)
  - invalid credential → 401 (client shows an error)

No real Google / database calls — everything is mocked.
"""
from unittest.mock import MagicMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

import auth_routes


def _build_client(fake_conn: MagicMock) -> TestClient:
    app = FastAPI()
    app.include_router(auth_routes.router)

    def override_conn():
        yield fake_conn

    app.dependency_overrides[auth_routes.get_conn] = override_conn
    return TestClient(app)


def test_google_login_success_returns_user():
    """Login with a valid Google credential succeeds and returns the user."""
    fake_conn = MagicMock()
    fake_cur = MagicMock()
    fake_conn.cursor.return_value = fake_cur

    client = _build_client(fake_conn)

    with patch("auth_routes.id_token.verify_oauth2_token") as verify:
        verify.return_value = {
            "sub": "google-sub-123",
            "email": "student@u.nus.edu",
            "name": "Test Student",
            "picture": "https://example.com/p.jpg",
        }
        res = client.post("/auth/google", json={"credential": "valid-token"})

    assert res.status_code == 200
    body = res.json()
    assert body["user_id"] == "google-sub-123"
    assert body["email"] == "student@u.nus.edu"
    assert body["name"] == "Test Student"
    fake_conn.commit.assert_called_once()


def test_google_login_invalid_token_returns_401():
    """Login with an invalid credential is rejected (no session created)."""
    fake_conn = MagicMock()
    client = _build_client(fake_conn)

    with patch(
        "auth_routes.id_token.verify_oauth2_token",
        side_effect=ValueError("bad token"),
    ):
        res = client.post("/auth/google", json={"credential": "bogus"})

    assert res.status_code == 401
    assert "Invalid token" in res.json()["detail"]
    fake_conn.commit.assert_not_called()
