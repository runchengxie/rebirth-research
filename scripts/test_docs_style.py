"""检查中文说明文档的基础表达约定。"""

from __future__ import annotations

import re
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent))
from validate_text_quality import find_document_issues  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
DOC_FILES = [
    ROOT / "README.md",
    ROOT / "AGENTS.md",
    *sorted((ROOT / "docs").glob("*.md")),
]


def test_docs_markdown_filenames_use_kebab_case() -> None:
    exceptions = {"README.md"}
    invalid = [
        path.name
        for path in (ROOT / "docs").glob("*.md")
        if path.name not in exceptions
        and re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*\.md", path.name) is None
    ]
    assert not invalid, f"docs Markdown 文件名应使用 kebab-case：{', '.join(invalid)}"


@pytest.mark.parametrize("path", DOC_FILES, ids=lambda path: str(path.relative_to(ROOT)))
def test_document_uses_the_agreed_chinese_style(path: Path) -> None:
    issues = find_document_issues(path.read_text(encoding="utf-8"))
    details = "\n".join(f"第 {issue.line} 行 [{issue.rule}] {issue.excerpt}" for issue in issues)
    assert not issues, f"{path.relative_to(ROOT)} 的中文表达需要调整：\n{details}"
