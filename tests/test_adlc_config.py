"""Validates the shape of the canonical .adlc.json (sole owner: this task)."""

import json
import shutil
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
REQUIRED_ENV_KEYS = {"FRONTEND_ORIGIN", "VITE_API_BASE_URL", "SQLITE_PATH"}


@pytest.fixture(scope="module")
def config():
    text = (ROOT / ".adlc.json").read_text()
    return json.loads(text)


def test_adlc_json_is_valid_json_and_parses_to_object():
    text = (ROOT / ".adlc.json").read_text()
    parsed = json.loads(text)
    assert isinstance(parsed, dict)


def test_adlc_json_has_required_top_level_keys(config):
    for key in ["test_command", "tech_stack", "env"]:
        assert key in config, key


def test_test_command_is_a_list_of_non_empty_strings(config):
    commands = config["test_command"]
    assert isinstance(commands, list)
    assert len(commands) > 0
    for command in commands:
        assert isinstance(command, str)
        assert command.strip() != ""


def test_test_command_does_not_include_unavailable_playwright_entry(config):
    for command in config["test_command"]:
        assert "playwright" not in command.lower()


def test_test_command_referenced_executables_are_available(config):
    for command in config["test_command"]:
        first_word = command.split()[0]
        if first_word in {"python", "npm", "ruff"}:
            assert shutil.which(first_word) is not None, first_word


def test_env_section_has_required_keys(config):
    assert REQUIRED_ENV_KEYS.issubset(config["env"].keys())


def test_env_values_are_non_empty_strings(config):
    for key in REQUIRED_ENV_KEYS:
        value = config["env"][key]
        assert isinstance(value, str)
        assert value.strip() != ""


def test_env_vite_api_base_url_ends_with_api(config):
    assert config["env"]["VITE_API_BASE_URL"].rstrip("/").endswith("/api")


def test_env_does_not_define_vite_api_url(config):
    assert "VITE_API_URL" not in config["env"]


def test_tech_stack_mentions_core_technologies(config):
    tech_stack_text = json.dumps(config["tech_stack"]).lower()
    for technology in ["fastapi", "pydantic", "react", "vite", "pytest"]:
        assert technology in tech_stack_text, technology
