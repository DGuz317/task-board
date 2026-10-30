"""The Vercel entrypoint must work without the repository on sys.path."""

import os
import subprocess
import sys
from pathlib import Path


def test_entrypoint_from_backend_service_root():
    backend_root = Path(__file__).resolve().parents[1]
    environment = os.environ.copy()
    environment.pop("PYTHONPATH", None)
    result = subprocess.run(
        [
            sys.executable,
            "-c",
            (
                "from main import app; "
                "from fastapi.testclient import TestClient; "
                "client = TestClient(app); "
                "response = client.get('/api/health'); "
                "assert response.status_code == 200, response.text; "
                "assert response.json() == {'status': 'ok'}; "
                "assert client.get('/api/docs').status_code == 200; "
                "assert client.get('/api/openapi.json').status_code == 200; "
                "assert client.get('/api/missing').status_code == 404"
            ),
        ],
        cwd=backend_root,
        env=environment,
        capture_output=True,
        text=True,
        check=False,
        timeout=30,
    )
    assert result.returncode == 0, result.stderr
