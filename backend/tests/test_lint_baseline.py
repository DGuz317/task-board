"""Verifies the ruff lint/format baseline described in CLAUDE.md."""

import shutil
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"

pytestmark = pytest.mark.skipif(shutil.which("ruff") is None, reason="ruff is not installed")


def test_ruff_check_passes_on_backend():
    result = subprocess.run(["ruff", "check", "."], cwd=BACKEND, capture_output=True, text=True)
    assert result.returncode == 0, result.stdout + result.stderr


def test_ruff_format_check_passes_on_backend():
    result = subprocess.run(
        ["ruff", "format", "--check", "."], cwd=BACKEND, capture_output=True, text=True
    )
    assert result.returncode == 0, result.stdout + result.stderr


def test_ruff_flags_unused_import(tmp_path):
    offender = tmp_path / "has_unused_import.py"
    offender.write_text("import os\n\n\ndef noop() -> None:\n    return None\n")

    result = subprocess.run(
        ["ruff", "check", "--isolated", "--select", "F401", str(offender)],
        cwd=BACKEND,
        capture_output=True,
        text=True,
    )

    assert result.returncode != 0
    assert "F401" in result.stdout


def test_ruff_config_selects_core_rules():
    config_text = (BACKEND / "ruff.toml").read_text()
    for rule in ["E", "F", "I", "UP", "B"]:
        assert f'"{rule}"' in config_text


def test_clean_backend_file_passes_ruff_check(tmp_path):
    clean_file = tmp_path / "clean.py"
    clean_file.write_text(
        '"""Module docstring."""\n\n\ndef add(a: int, b: int) -> int:\n    return a + b\n'
    )

    result = subprocess.run(
        ["ruff", "check", "--isolated", "--select", "F401", str(clean_file)],
        cwd=BACKEND,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stdout + result.stderr


@pytest.mark.skipif(sys.platform == "win32", reason="not relevant on windows")
def test_requirements_lists_ruff():
    requirements = (BACKEND / "requirements.txt").read_text()
    assert "ruff" in requirements
