"""测试中文文档和游戏台词的低误报文本门禁。"""

from __future__ import annotations

import json
import sys
from collections.abc import Iterable
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from validate_text_quality import (  # noqa: E402
    TextIssue,
    find_dialogue_issues,
    find_document_issues,
    find_merged_speaker_compositions,
    json_text_samples,
    markdown_prose,
    typescript_string_samples,
    validate_repository,
)


def issue_rules(issues: Iterable[TextIssue]) -> set[str]:
    return {issue.rule for issue in issues}


def test_markdown_mask_keeps_prose_and_ignores_technical_regions() -> None:
    text = """中文说明通过[项目主页](https://example.com/a_(b))查看。

行内代码 `render(text)` 和裸链接 https://example.com/path_(x) 保持原样。

```tsx
const bad = "不是这样；而是那样（测试）";
```
"""
    prose = markdown_prose(text)
    assert "中文说明通过[项目主页]" in prose
    assert "https://" not in prose
    assert "render(text)" not in prose
    assert find_document_issues(text) == []


def test_document_rules_cover_the_explicit_chinese_style_contract() -> None:
    text = """**重点**不要写成“口号”；也不要使用——长破折号。
这不是简单包装，而是完整功能。
中文说明(test):下一句,仍然使用英文标点.
"""
    assert issue_rules(find_document_issues(text)) == {
        "使用双星号强调",
        "使用中文双引号",
        "使用中文分号",
        "使用长破折号",
        "使用成对否定转折",
        "中文语境使用英文括号",
        "中文语境使用英文标点",
    }


def test_document_rules_allow_technical_terms_and_inline_code() -> None:
    text = "支持 AI、ARR、TypeScript、Node.js 和 DeepSeek-R1。运行 `npm run check` 即可。"
    assert find_document_issues(text) == []


def test_dialogue_rules_find_repeated_marks_parentheses_and_merged_speakers() -> None:
    text = (
        "林若宁的基本面说：先看 ARR。。"
        "陈星禾的量价说：再看成交(test)，"
        "周明昭的风控说：最后写退出条件。"
    )
    assert issue_rules(find_dialogue_issues(text)) >= {
        "重复句末标点",
        "中文语境使用英文括号",
        "单段合并多位说话人",
    }


def test_dialogue_rules_allow_one_speaker_per_paragraph() -> None:
    text = (
        "林若宁说：先看付费意愿与部署能力。\n\n"
        "陈星禾说：再看成交结构与资金持续性。\n\n"
        "周明昭说：最后写清估值和退出条件。"
    )
    assert find_dialogue_issues(text) == []


def test_dynamic_composition_rule_catches_the_old_comma_join() -> None:
    old_source = """
function build(ch) {
  const parts = [];
  parts.push(`林若宁的基本面说：${ch.lin}`);
  parts.push(`陈星禾的量价说：${ch.chen}`);
  parts.push(`周明昭的风控说：${ch.zhou}`);
  return parts.join("，");
}
"""
    separated_source = old_source.replace('join("，")', 'join("\\n\\n")')
    assert issue_rules(find_merged_speaker_compositions(old_source)) == {"用逗号动态合并多位说话人"}
    assert find_merged_speaker_compositions(separated_source) == []


def test_typescript_extractor_skips_comments_and_reports_literal_lines(tmp_path: Path) -> None:
    path = tmp_path / "content.ts"
    path.write_text(
        '// "注释(test)"\n'
        'const title = "正常标题";\n'
        'const line = `台词(test)：${condition ?? "备用？？"}结束。`;\n',
        encoding="utf-8",
    )
    samples = list(typescript_string_samples(path))
    assert [(sample.line, sample.text) for sample in samples] == [
        (2, "正常标题"),
        (3, "台词(test)： 结束。"),
    ]
    rules = issue_rules(find_dialogue_issues(samples[1].text))
    assert "中文语境使用英文括号" in rules
    assert "重复句末标点" not in rules


def test_json_extractor_preserves_locations_and_lines(tmp_path: Path) -> None:
    path = tmp_path / "content.json"
    path.write_text(
        json.dumps(
            {"themes": [{"title": "第一行", "dialogue": "第二句。。"}]},
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    samples = list(json_text_samples(path))
    assert [sample.location for sample in samples] == [
        "$.themes[0].title",
        "$.themes[0].dialogue",
    ]
    assert samples[1].line > samples[0].line


def test_repository_validator_scans_docs_json_and_dynamic_ts(tmp_path: Path) -> None:
    (tmp_path / "docs").mkdir()
    (tmp_path / "src" / "game" / "content").mkdir(parents=True)
    (tmp_path / "README.md").write_text("中文说明(test)。\n", encoding="utf-8")
    (tmp_path / "AGENTS.md").write_text("协作说明。\n", encoding="utf-8")
    (tmp_path / "docs" / "guide.md").write_text("使用指南。\n", encoding="utf-8")
    (tmp_path / "src" / "game" / "content" / "2025.json").write_text(
        json.dumps({"line": "结论。。"}, ensure_ascii=False),
        encoding="utf-8",
    )
    (tmp_path / "src" / "game" / "scene.ts").write_text(
        "const parts = [];\n"
        "parts.push(`林若宁说：${lin}`);\n"
        "parts.push(`陈星禾说：${chen}`);\n"
        'parts.join("，");\n',
        encoding="utf-8",
    )

    messages = validate_repository(tmp_path)
    assert any("README.md:1" in message and "英文括号" in message for message in messages)
    assert any("2025.json:1" in message and "重复句末标点" in message for message in messages)
    assert any("scene.ts:4" in message and "动态合并" in message for message in messages)
