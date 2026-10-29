"""CORS configuration tests: exact-origin allowlist, never a wildcard."""

from __future__ import annotations

import re
from pathlib import Path

from fastapi.testclient import TestClient

from backend.app.main import create_app

ROOT = Path(__file__).resolve().parents[2]
FRONTEND_ORIGIN = "http://localhost:5173"


def test_matching_origin_gets_exact_acao_header(monkeypatch):
    monkeypatch.setenv("FRONTEND_ORIGIN", FRONTEND_ORIGIN)
    client = TestClient(create_app())
    response = client.get("/api/health", headers={"Origin": FRONTEND_ORIGIN})
    assert response.headers.get("access-control-allow-origin") == FRONTEND_ORIGIN


def test_preflight_matching_origin_gets_exact_acao_header(monkeypatch):
    monkeypatch.setenv("FRONTEND_ORIGIN", FRONTEND_ORIGIN)
    client = TestClient(create_app())
    response = client.options(
        "/api/health",
        headers={
            "Origin": FRONTEND_ORIGIN,
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.headers.get("access-control-allow-origin") == FRONTEND_ORIGIN


def test_non_matching_origin_gets_no_acao_header(monkeypatch):
    monkeypatch.setenv("FRONTEND_ORIGIN", FRONTEND_ORIGIN)
    client = TestClient(create_app())
    response = client.get("/api/health", headers={"Origin": "http://evil.example"})
    assert "access-control-allow-origin" not in response.headers


def test_acao_header_is_never_wildcard(monkeypatch):
    monkeypatch.setenv("FRONTEND_ORIGIN", FRONTEND_ORIGIN)
    client = TestClient(create_app())
    for origin in (FRONTEND_ORIGIN, "http://evil.example"):
        response = client.get("/api/health", headers={"Origin": origin})
        assert response.headers.get("access-control-allow-origin") != "*"


def test_unset_frontend_origin_does_not_crash_and_has_no_acao(monkeypatch):
    monkeypatch.delenv("FRONTEND_ORIGIN", raising=False)
    app = create_app()
    client = TestClient(app)
    response = client.get("/api/health", headers={"Origin": "http://localhost:5173"})
    assert response.status_code == 200
    assert "access-control-allow-origin" not in response.headers


def test_whitespace_only_frontend_origin_treated_as_unset(monkeypatch):
    monkeypatch.setenv("FRONTEND_ORIGIN", "   ")
    app = create_app()
    client = TestClient(app)
    response = client.get("/api/health", headers={"Origin": "http://localhost:5173"})
    assert "access-control-allow-origin" not in response.headers


def _backend_source_files():
    for path in ROOT.joinpath("backend").rglob("*.py"):
        if "tests" in path.relative_to(ROOT / "backend").parts:
            continue
        yield path


def test_cors_middleware_registered_exactly_once_in_main():
    needle = re.compile("add_middleware" + r"\(\s*" + "CORSMiddleware")
    matches = []
    for path in _backend_source_files():
        text = path.read_text()
        count = len(needle.findall(text))
        if count:
            matches.append((path, count))

    total = sum(count for _, count in matches)
    assert total == 1, matches
    assert matches[0][0].name == "main.py"
    assert matches[0][0].parent.name == "app"


def test_no_credential_literals_in_backend_source():
    patterns = [
        re.compile(r"password\s*=\s*['\"]", re.IGNORECASE),
        re.compile(r"secret\s*=\s*['\"]", re.IGNORECASE),
        re.compile(r"api_key\s*=\s*['\"]", re.IGNORECASE),
        re.compile(r"AKIA[0-9A-Z]{16}"),
        re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
    ]
    offenders = []
    for path in ROOT.joinpath("backend").rglob("*.py"):
        text = path.read_text()
        for pattern in patterns:
            if pattern.search(text):
                offenders.append((path, pattern.pattern))
    assert offenders == []
