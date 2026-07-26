"""
API-level tests that never touch the real database or external services.

We build a minimal FastAPI app with the same module-code validation logic as
main.get_course, so Render / production code paths stay unchanged.
"""
import re
from unittest.mock import MagicMock

from fastapi import Depends, FastAPI, HTTPException
from fastapi.testclient import TestClient

MODULE_CODE_RE = re.compile(r"^[A-Z]{2,3}\d{4}[A-Z]{0,2}$")


def _fake_conn():
    yield MagicMock()


def create_test_app() -> FastAPI:
    app = FastAPI()

    @app.get("/course/{module_code}")
    def get_course(module_code: str, conn=Depends(_fake_conn)):
        module_code = module_code.upper()
        if not MODULE_CODE_RE.match(module_code):
            raise HTTPException(status_code=400, detail="Invalid module code format")
        # Simulate a cached hit without calling DB / NLP
        return {"module": module_code, "title": "Test Module"}

    @app.get("/health")
    def health():
        return {"ok": True}

    return app


client = TestClient(create_test_app())


def test_health_ok():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["ok"] is True


def test_valid_module_code_accepted():
    res = client.get("/course/CS2040S")
    assert res.status_code == 200
    assert res.json()["module"] == "CS2040S"


def test_module_code_is_uppercased():
    res = client.get("/course/cs1010")
    assert res.status_code == 200
    assert res.json()["module"] == "CS1010"


def test_invalid_module_code_rejected():
    res = client.get("/course/not-a-module")
    assert res.status_code == 400
    assert "Invalid module code" in res.json()["detail"]


def test_module_code_too_short_rejected():
    res = client.get("/course/CS1")
    assert res.status_code == 400
