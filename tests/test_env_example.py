"""Validates .env.example's contract: placeholders only, VITE_API_BASE_URL
ends in /api, VITE_API_URL is never defined, and no .env file is tracked."""

import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REQUIRED_KEYS = {"FRONTEND_ORIGIN", "VITE_API_BASE_URL", "SQLITE_PATH"}
SECRET_PATTERN = re.compile(r"(SECRET|TOKEN|PASSWORD|API_KEY)", re.IGNORECASE)


def _parse_env_file(path):
    values = {}
    for line in path.read_text().splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, _, value = stripped.partition("=")
        values[key.strip()] = value.strip()
    return values


def test_env_example_defines_required_keys_with_non_empty_values():
    values = _parse_env_file(ROOT / ".env.example")
    for key in REQUIRED_KEYS:
        assert key in values, key
        assert values[key] != "", key


def test_env_example_vite_api_base_url_ends_with_api():
    values = _parse_env_file(ROOT / ".env.example")
    assert values["VITE_API_BASE_URL"].rstrip("/").endswith("/api")


def test_env_example_does_not_define_vite_api_url():
    text = (ROOT / ".env.example").read_text()
    assert "VITE_API_URL" not in text


def test_env_example_has_no_secret_looking_keys():
    values = _parse_env_file(ROOT / ".env.example")
    offenders = [key for key in values if SECRET_PATTERN.search(key)]
    assert offenders == []


def test_env_example_matches_adlc_json_env_values():
    adlc = json.loads((ROOT / ".adlc.json").read_text())
    env_values = _parse_env_file(ROOT / ".env.example")
    for key in REQUIRED_KEYS:
        assert adlc["env"][key] == env_values[key], key


def test_no_vite_api_url_anywhere_in_frontend_source():
    frontend_src = ROOT / "frontend" / "src"
    for path in frontend_src.rglob("*"):
        if path.is_file() and path.suffix in {".js", ".jsx", ".ts", ".tsx"}:
            assert "VITE_API_URL" not in path.read_text(), path


def test_gitignore_covers_env_but_not_env_example():
    gitignore = (ROOT / ".gitignore").read_text()
    assert ".env" in gitignore
    assert "!.env.example" in gitignore
    result = subprocess.run(  # noqa: PLW1510
        ["git", "check-ignore", "-q", ".env"], cwd=ROOT, capture_output=True
    )
    assert result.returncode == 0
    result = subprocess.run(  # noqa: PLW1510
        ["git", "check-ignore", "-q", ".env.example"], cwd=ROOT, capture_output=True
    )
    assert result.returncode == 1


def test_no_env_file_is_tracked_by_git():
    result = subprocess.run(  # noqa: PLW1510
        ["git", "ls-files"], cwd=ROOT, capture_output=True, text=True
    )
    if result.returncode != 0:
        return
    tracked = result.stdout.splitlines()
    assert [f for f in tracked if Path(f).name == ".env"] == []
