"""Verifies the single-command dev scripts, the root package.json wiring,
the README contract docs, and the backend health/CORS contract they rely on.
"""

from __future__ import annotations

import json
import os
import signal
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path

from fastapi.testclient import TestClient

from backend.app.main import create_app

ROOT = Path(__file__).resolve().parents[1]
FRONTEND_ORIGIN = "http://localhost:5173"


def _poll_for_200(url, timeout=15.0):
    deadline = time.monotonic() + timeout
    last_error = None
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=1) as response:
                if response.status == 200:
                    return True
        except (urllib.error.URLError, ConnectionError) as error:
            last_error = error
        time.sleep(0.5)
    raise AssertionError(f"{url} never returned 200: {last_error}")


def _stop(process):
    if process.poll() is not None:
        return
    process.send_signal(signal.SIGTERM)
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=5)


def test_root_package_json_defines_both_dev_scripts():
    package = json.loads((ROOT / "package.json").read_text())
    assert package["scripts"]["dev:backend"] == "./scripts/dev-backend.sh"
    assert package["scripts"]["dev:frontend"] == "./scripts/dev-frontend.sh"


def test_root_package_json_has_no_dependencies():
    package = json.loads((ROOT / "package.json").read_text())
    assert "dependencies" not in package
    assert "devDependencies" not in package


def test_dev_scripts_exist_and_are_executable():
    for name in ["dev-backend.sh", "dev-frontend.sh"]:
        path = ROOT / "scripts" / name
        assert path.is_file(), name
        assert os.access(path, os.X_OK), f"{name} is not executable"


def test_readme_documents_both_dev_commands_and_base_url_contract():
    text = (ROOT / "README.md").read_text()
    assert "dev:backend" in text
    assert "dev:frontend" in text
    assert "VITE_API_BASE_URL" in text
    assert "/api" in text


def test_health_endpoint_returns_200_via_testclient():
    client = TestClient(create_app())
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_cors_preflight_from_frontend_origin_gets_matching_acao_header(monkeypatch):
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


def test_cors_rejects_an_origin_that_is_not_frontend_origin(monkeypatch):
    monkeypatch.setenv("FRONTEND_ORIGIN", FRONTEND_ORIGIN)
    client = TestClient(create_app())
    response = client.get("/api/health", headers={"Origin": "http://evil.example"})
    assert "access-control-allow-origin" not in response.headers


def test_dev_backend_script_serves_health_on_8000():
    process = subprocess.Popen(
        [str(ROOT / "scripts" / "dev-backend.sh")],
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    try:
        _poll_for_200("http://localhost:8000/api/health")
        with urllib.request.urlopen(
            "http://localhost:8000/api/health", timeout=2
        ) as response:
            assert json.loads(response.read()) == {"status": "ok"}
    finally:
        _stop(process)


def test_dev_frontend_script_serves_app_shell_on_5173():
    process = subprocess.Popen(
        [str(ROOT / "scripts" / "dev-frontend.sh")],
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    try:
        _poll_for_200("http://localhost:5173/")
        with urllib.request.urlopen("http://localhost:5173/", timeout=2) as response:
            body = response.read().decode()
            assert '<div id="root">' in body or 'id="root"' in body
    finally:
        _stop(process)
