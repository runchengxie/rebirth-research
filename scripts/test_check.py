"""本地质量入口和 Pages 工作流的契约测试。"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import check  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent


def _commands(checks: tuple[check.Check, ...]) -> set[tuple[str, ...]]:
    return {item.command for item in checks}


def test_local_check_inventory_covers_all_quality_layers() -> None:
    assert _commands(check.PYTHON_CHECKS) >= {
        ("uv", "run", "ruff", "check", "."),
        ("uv", "run", "ruff", "format", "--check", "."),
        ("uv", "run", "ty", "check", "scripts"),
        ("uv", "run", "pytest", "scripts/", "-v"),
        ("uv", "run", "python", "scripts/validate_data.py"),
        ("uv", "run", "python", "scripts/validate_text_quality.py"),
    }
    assert _commands(check.FRONTEND_CHECKS) >= {
        ("npm", "run", "lint:ci"),
        ("npm", "run", "typecheck"),
        ("npm", "run", "test:run"),
        ("npm", "run", "validate:frontend"),
        ("npm", "run", "validate:stability"),
        ("npm", "run", "validate:brand"),
        ("npm", "run", "build"),
        ("npm", "run", "validate:bundle"),
    }
    assert _commands(check.BROWSER_CHECKS) == {
        ("npm", "run", "e2e:prepare"),
        ("npm", "run", "test:e2e"),
    }


def test_default_local_entry_runs_python_frontend_and_browser(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[str] = []
    monkeypatch.setattr(
        check,
        "parse_args",
        lambda: argparse.Namespace(all=False, python=False, frontend=False, e2e=False),
    )
    monkeypatch.setattr(check, "check_python", lambda: calls.append("python") or True)
    monkeypatch.setattr(check, "check_frontend", lambda: calls.append("frontend") or True)
    monkeypatch.setattr(check, "check_browser", lambda: calls.append("e2e") or True)

    with pytest.raises(SystemExit) as result:
        check.main()

    assert result.value.code == 0
    assert calls == ["python", "frontend", "e2e"]


def test_package_and_pages_workflow_keep_quality_local() -> None:
    package_json = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
    scripts = package_json["scripts"]
    dev_dependencies = package_json["devDependencies"]

    assert scripts["check"] == "uv run python scripts/check.py"
    assert scripts["build"] == "tsc -b && vite build"
    assert scripts["build:pages"] == "vite build"
    assert scripts["e2e:prepare"] == "playwright install chromium"
    assert dev_dependencies["@playwright/test"] == "1.55.0"
    assert dev_dependencies["@axe-core/playwright"] == "4.10.2"

    workflow = (ROOT / ".github/workflows/pages.yml").read_text(encoding="utf-8")
    assert "pull_request:" not in workflow
    assert re.search(r"^  build:$", workflow, flags=re.MULTILINE)
    assert re.search(r"^  deploy:$", workflow, flags=re.MULTILINE)
    assert not re.search(r"^  (quality|e2e):$", workflow, flags=re.MULTILINE)
    assert "npm run build:pages" in workflow
    assert not re.search(r"run: npm run build$", workflow, flags=re.MULTILINE)
    for command in (
        "npm run check",
        "npm run test:run",
        "npm run test:e2e",
        "npm run lint:ci",
        "npm run typecheck",
        "tsc -b",
    ):
        assert command not in workflow
