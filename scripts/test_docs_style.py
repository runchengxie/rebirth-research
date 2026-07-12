"""检查中文说明文档的基础表达约定。"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
DOC_FILES = [
    ROOT / "README.md",
    ROOT / "AGENTS.md",
    *sorted((ROOT / "docs").glob("*.md")),
]


def prose_only(text: str) -> str:
    """移除代码块、行内代码和裸链接，减少对技术符号的误报。"""
    text = re.sub(r"```.*?```", "", text, flags=re.S)
    text = re.sub(r"`[^`\n]+`", "", text)
    text = re.sub(r"<https?://[^>]+>", "", text)
    return text


@pytest.mark.parametrize("path", DOC_FILES, ids=lambda path: str(path.relative_to(ROOT)))
def test_document_uses_the_agreed_chinese_style(path: Path) -> None:
    text = prose_only(path.read_text(encoding="utf-8"))
    forbidden = {
        "粗体强调": "**",
        "中文双引号左": "“",
        "中文双引号右": "”",
        "中文分号": "；",
        "长破折号": "——",
    }
    problems = [name for name, token in forbidden.items() if token in text]
    assert not problems, f"{path.relative_to(ROOT)} 含有：{', '.join(problems)}"

    paired_turn = re.search(r"不是[^。！？\n]{0,50}而是", text)
    assert paired_turn is None, (
        f"{path.relative_to(ROOT)} 含有可直接改写的成对否定转折：{paired_turn.group(0)}"
    )


@pytest.mark.parametrize("path", DOC_FILES, ids=lambda path: str(path.relative_to(ROOT)))
def test_document_prefers_chinese_parentheses_in_chinese_prose(path: Path) -> None:
    text = prose_only(path.read_text(encoding="utf-8"))
    match = re.search(r"[\u4e00-\u9fff]\([^\n)]{0,80}\)|\([^\n)]{0,80}\)[\u4e00-\u9fff]", text)
    assert match is None, (
        f"{path.relative_to(ROOT)} 的中文段落使用了英文括号：{match.group(0)}"
    )
