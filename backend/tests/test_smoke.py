import re
import subprocess
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from backend.main import app
from backend.models import Board

ROOT = Path(__file__).resolve().parents[2]


def test_required_paths_exist():
    for rel in ["backend/main.py", "backend/db.py", "backend/models.py"]:
        assert (ROOT / rel).is_file(), rel
    assert (ROOT / "backend/tests").is_dir()
    assert (ROOT / "frontend/src").is_dir()


def _requirements():
    lines = (ROOT / "backend/requirements.txt").read_text().splitlines()
    return [line.strip() for line in lines if line.strip() and not line.startswith("#")]


@pytest.mark.parametrize("name", ["fastapi", "uvicorn", "pytest", "httpx", "ruff"])
def test_requirements_lists_package(name):
    assert any(re.match(rf"{name}(\[.*\])?\s*([<>=!~]|$)", r) for r in _requirements())


def test_requirements_pydantic_v2_or_newer():
    spec = [r for r in _requirements() if re.match(r"pydantic\s*[<>=!~]", r)]
    assert len(spec) == 1
    assert re.search(r">=\s*2", spec[0])


def test_requirements_resolve_without_installing():
    result = subprocess.run(  # noqa: PLW1510
        [
            sys.executable,
            "-m",
            "pip",
            "install",
            "--dry-run",
            "-q",
            "-r",
            str(ROOT / "backend/requirements.txt"),
        ],
        capture_output=True,
        text=True,
        timeout=300,
    )
    assert result.returncode == 0, result.stderr


@pytest.mark.parametrize(
    "path",
    [
        ".env",
        "node_modules/x.js",
        "dist/a.js",
        "pkg/__pycache__/m.pyc",
        "test.db",
        "a.sqlite",
        "b.sqlite3",
    ],
)
def test_gitignore_ignores(path):
    result = subprocess.run(  # noqa: PLW1510
        ["git", "check-ignore", "-q", path], cwd=ROOT, capture_output=True
    )
    assert result.returncode == 0, path


def test_gitignore_does_not_ignore_source():
    result = subprocess.run(  # noqa: PLW1510
        ["git", "check-ignore", "-q", "backend/main.py"], cwd=ROOT, capture_output=True
    )
    assert result.returncode == 1


def test_no_env_file_tracked():
    out = subprocess.run(
        ["git", "ls-files"], cwd=ROOT, capture_output=True, text=True, check=True
    ).stdout.splitlines()
    assert [f for f in out if Path(f).name == ".env"] == []


def test_import_db_and_models_from_repo_root():
    result = subprocess.run(  # noqa: PLW1510
        [sys.executable, "-c", "import backend.db, backend.models"],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stderr
    assert not list(ROOT.glob("*.sqlite")) and not list(ROOT.glob("*.db"))


def test_health_endpoint():
    response = TestClient(app).get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_unknown_route_404():
    assert TestClient(app).get("/api/nope").status_code == 404


def test_board_validates_and_trims():
    assert Board(id=1, name="  Work ").name == "Work"


def test_board_rejects_blank_name():
    with pytest.raises(ValidationError):
        Board(id=1, name="   ")


def test_get_connection_is_lazy_and_works(tmp_path, monkeypatch):
    from backend import db

    monkeypatch.setattr(db, "DB_PATH", str(tmp_path / "t.sqlite"))
    conn = db.get_connection()
    try:
        assert conn.execute("select 1").fetchone() == (1,)
    finally:
        conn.close()
