#!/usr/bin/env python
"""统一运行 Python 和前端检查。"""

from __future__ import annotations

import argparse
import subprocess
from pathlib import Path
from typing import NamedTuple

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_TIMEOUT_SECONDS = 300
BROWSER_TIMEOUT_SECONDS = 900


class Check(NamedTuple):
    label: str
    command: tuple[str, ...]
    timeout: int = DEFAULT_TIMEOUT_SECONDS


def _uv_run(*args: str) -> list[str]:
    return ["uv", "run", *args]


def run(
    cmd: list[str],
    *,
    label: str,
    timeout: int = DEFAULT_TIMEOUT_SECONDS,
    allow_failure: bool = False,
) -> bool:
    """运行一条检查命令并打印精简结果。

    allow_failure=True 时即使失败也返回 True（非阻塞检查）。
    """
    header = f"[{label}]"
    try:
        result = subprocess.run(
            cmd,
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
    except FileNotFoundError:
        print(f"  失败 {header}，未找到命令")
        return False
    except subprocess.TimeoutExpired:
        print(f"  失败 {header}，运行超过 {timeout} 秒")
        return False

    if result.returncode == 0:
        print(f"  通过 {header}")
        return True

    if allow_failure:
        print(f"  警告 {header}（非阻塞）")
        if result.stdout.strip():
            for line in result.stdout.strip().splitlines()[:20]:
                print(f"    {line}")
        if result.stderr.strip():
            for line in result.stderr.strip().splitlines()[:10]:
                print(f"    {line}")
        return True

    print(f"  失败 {header}")
    if result.stdout.strip():
        for line in result.stdout.strip().splitlines()[:20]:
            print(f"    {line}")
    if result.stderr.strip():
        for line in result.stderr.strip().splitlines()[:10]:
            print(f"    {line}")
    return False


PYTHON_CHECKS = (
    Check("ruff check", tuple(_uv_run("ruff", "check", "."))),
    Check("ruff format", tuple(_uv_run("ruff", "format", "--check", "."))),
    Check("compileall", tuple(_uv_run("python", "-m", "compileall", "scripts"))),
    Check("ty", tuple(_uv_run("ty", "check", "scripts"))),
    Check("pytest", tuple(_uv_run("pytest", "scripts/", "-v"))),
    Check("validate_data", tuple(_uv_run("python", "scripts/validate_data.py"))),
    Check(
        "validate_text_quality",
        tuple(_uv_run("python", "scripts/validate_text_quality.py")),
    ),
)

FRONTEND_CHECKS = (
    Check("ESLint", ("npm", "run", "lint:ci")),
    Check("TypeScript", ("npm", "run", "typecheck")),
    Check("Vitest", ("npm", "run", "test:run")),
    Check("validate_frontend", ("npm", "run", "validate:frontend")),
    Check("validate_stability", ("npm", "run", "validate:stability")),
    Check("validate_brand", ("npm", "run", "validate:brand")),
    Check("build", ("npm", "run", "build")),
    Check("validate_bundle", ("npm", "run", "validate:bundle")),
)

BROWSER_CHECKS = (
    Check("Playwright Chromium", ("npm", "run", "e2e:prepare"), BROWSER_TIMEOUT_SECONDS),
    Check("Playwright journeys", ("npm", "run", "test:e2e"), BROWSER_TIMEOUT_SECONDS),
)


def run_checks(title: str, checks: tuple[Check, ...]) -> bool:
    print(f"── {title} ──")
    ok = True
    for check in checks:
        ok &= run(
            list(check.command),
            label=check.label,
            timeout=check.timeout,
        )
    return ok


def check_python() -> bool:
    return run_checks("Python", PYTHON_CHECKS)


def check_frontend() -> bool:
    return run_checks("前端", FRONTEND_CHECKS)


def check_browser() -> bool:
    return run_checks("浏览器", BROWSER_CHECKS)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="运行项目检查")
    parser.add_argument("--all", action="store_true", help="兼容参数，完整检查现已默认执行")
    parser.add_argument("--python", action="store_true", help="只运行 Python 检查")
    parser.add_argument("--frontend", action="store_true", help="只运行前端检查")
    parser.add_argument("--e2e", action="store_true", help="只运行浏览器准备和端到端检查")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    run_python = args.python
    run_frontend = args.frontend
    run_browser = args.e2e
    if args.all or not (run_python or run_frontend or run_browser):
        run_python = True
        run_frontend = True
        run_browser = True

    ok = True
    if run_python:
        ok &= check_python()
    if run_frontend:
        ok &= check_frontend()
    if run_browser:
        ok &= check_browser()

    if ok:
        print("\n全部阻塞检查通过。")
        raise SystemExit(0)

    print("\n存在未通过的阻塞检查。")
    raise SystemExit(1)


if __name__ == "__main__":
    main()
