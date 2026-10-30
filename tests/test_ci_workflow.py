"""Validates .github/workflows/ci.yml against the CI acceptance criteria.

ci.yml is the single owner of this workflow (sole owner: SCRUM-333). E2E
execution/gating belongs solely to the [QA] epic's separate quality-gates
workflow and must never appear here.
"""

import json
import re
from pathlib import Path

import pytest
import yaml

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW_PATH = ROOT / ".github" / "workflows" / "ci.yml"


@pytest.fixture(scope="module")
def raw_text():
    return WORKFLOW_PATH.read_text()


@pytest.fixture(scope="module")
def workflow(raw_text):
    return yaml.safe_load(raw_text)


def _triggers(workflow):
    # PyYAML parses the unquoted `on:` key as the boolean True.
    if "on" in workflow:
        return workflow["on"]
    assert True in workflow, "workflow has no 'on' trigger key"
    return workflow[True]


def _all_run_commands(workflow):
    commands = []
    for job in workflow["jobs"].values():
        for step in job.get("steps", []):
            if "run" in step:
                commands.append(step["run"])
    return commands


def test_workflow_file_exists():
    assert WORKFLOW_PATH.is_file()


def test_workflow_is_valid_yaml_and_is_a_mapping(workflow):
    assert isinstance(workflow, dict)
    assert "jobs" in workflow


def test_triggers_on_push_and_pull_request(workflow):
    triggers = _triggers(workflow)
    assert "push" in triggers
    assert "pull_request" in triggers


@pytest.mark.parametrize(
    "fragment",
    [
        "ruff check",
        "ruff format --check",
        "pytest",
        "npm run lint",
        "npm run format:check",
        "npm test",
        "npm run build",
    ],
)
def test_workflow_runs_required_command_as_its_own_step(workflow, fragment):
    commands = _all_run_commands(workflow)
    matching = [c for c in commands if fragment in c]
    assert matching, f"no step runs {fragment!r}; steps were: {commands}"


def test_required_commands_are_separate_steps_not_combined(workflow):
    commands = _all_run_commands(workflow)
    # Each required command must be alone on its own step (not chained with &&
    # into another required command), so a single failure isolates cleanly.
    required = [
        "ruff check",
        "ruff format --check",
        "pytest",
        "npm run lint",
        "npm run format:check",
        "npm test",
        "npm run build",
    ]
    for command in commands:
        hits = [r for r in required if r in command]
        assert len(hits) <= 1, f"step {command!r} combines multiple required commands: {hits}"


def test_uses_python_3_11(raw_text):
    assert re.search(r"python-version:\s*['\"]?3\.11['\"]?", raw_text)


def test_uses_node_lts_version(raw_text):
    match = re.search(r"node-version:\s*['\"]?([\w./*]+)['\"]?", raw_text)
    assert match, "no node-version found"
    value = match.group(1)
    if value == "lts/*":
        return
    major = int(re.match(r"(\d+)", value).group(1))
    assert major >= 20 and major % 2 == 0, f"node-version {value!r} is not an LTS line"


@pytest.mark.parametrize("forbidden", ["test:e2e", "playwright", "e2e"])
def test_workflow_contains_no_playwright_or_e2e_references(raw_text, forbidden):
    assert forbidden not in raw_text.lower()


def test_workflow_references_no_secrets(raw_text):
    assert "secrets." not in raw_text


def test_backend_and_frontend_jobs_run_independently(workflow):
    jobs = workflow["jobs"]
    backend_jobs = [
        name
        for name, job in jobs.items()
        if any("pytest" in step.get("run", "") for step in job.get("steps", []))
    ]
    frontend_jobs = [
        name
        for name, job in jobs.items()
        if any("npm run build" in step.get("run", "") for step in job.get("steps", []))
    ]
    assert backend_jobs, "no job runs pytest"
    assert frontend_jobs, "no job runs npm run build"
    assert set(backend_jobs).isdisjoint(frontend_jobs), (
        "the health smoke test (pytest) and the frontend smoke test (npm test/build) "
        "must fail independent jobs, not share one job"
    )


def test_frontend_npm_scripts_referenced_exist_in_package_json():
    package_json = json.loads((ROOT / "frontend" / "package.json").read_text())
    scripts = package_json.get("scripts", {})
    for name in ["lint", "format:check", "test", "build"]:
        assert name in scripts, f"frontend/package.json is missing npm script {name!r}"
