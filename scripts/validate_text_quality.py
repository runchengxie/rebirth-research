#!/usr/bin/env python
"""检查中文说明文档和游戏台词中可机械判断的文本问题。"""

from __future__ import annotations

import json
import re
import sys
from collections.abc import Iterable, Iterator
from dataclasses import dataclass
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[1]
HAN_RE = re.compile(r"[\u3400-\u9fff]")


@dataclass(frozen=True)
class TextIssue:
    """一条带行号和简短上下文的文本问题。"""

    rule: str
    line: int
    excerpt: str


@dataclass(frozen=True)
class TextSample:
    """从源码或数据文件中提取的一段中文文本。"""

    path: Path
    line: int
    text: str
    location: str = ""


def _mask_range(chars: list[str], start: int, end: int) -> None:
    for index in range(start, end):
        if chars[index] != "\n":
            chars[index] = " "


def markdown_prose(text: str) -> str:
    """遮住 Markdown 中不属于正文的部分，同时保留原始行号。"""
    chars = list(text)

    fence_start: tuple[str, int] | None = None
    offset = 0
    for line in text.splitlines(keepends=True):
        marker = re.match(r" {0,3}(`{3,}|~{3,})", line)
        if fence_start is None and marker:
            fence_start = (marker.group(1)[0], len(marker.group(1)))
            _mask_range(chars, offset, offset + len(line))
        elif fence_start is not None:
            _mask_range(chars, offset, offset + len(line))
            closing = re.match(r" {0,3}(`{3,}|~{3,})[ \t]*(?:\n)?$", line)
            if (
                closing
                and closing.group(1)[0] == fence_start[0]
                and len(closing.group(1)) >= fence_start[1]
            ):
                fence_start = None
        offset += len(line)

    masked = "".join(chars)
    for pattern in (
        re.compile(r"(`+)[^\n]*?\1"),
        re.compile(r"<https?://[^>\n]+>"),
        re.compile(r"https?://[^\s<>)]+"),
        re.compile(r"^[ \t]*\[[^\]\n]+\]:[^\n]*$", re.MULTILINE),
        re.compile(r"<[^>\n]+>"),
    ):
        for match in pattern.finditer(masked):
            _mask_range(chars, match.start(), match.end())

    # Markdown 链接保留可见文字，只遮住 `(地址)`，避免中文链接标题触发英文括号规则。
    masked = "".join(chars)
    for match in re.finditer(r"!?\[[^\]\n]*\](\((?:\\.|[^)\n])*\))", masked):
        destination = match.span(1)
        _mask_range(chars, destination[0], destination[1])

    return "".join(chars)


def _line_number(text: str, position: int) -> int:
    return text.count("\n", 0, position) + 1


def _excerpt(text: str, start: int, end: int, *, radius: int = 28) -> str:
    left = max(text.rfind("\n", 0, start) + 1, start - radius)
    next_newline = text.find("\n", end)
    line_end = len(text) if next_newline < 0 else next_newline
    right = min(line_end, end + radius)
    return re.sub(r"\s+", " ", text[left:right]).strip()


def _regex_issues(text: str, rule: str, pattern: re.Pattern[str]) -> list[TextIssue]:
    return [
        TextIssue(
            rule=rule,
            line=_line_number(text, match.start()),
            excerpt=_excerpt(text, match.start(), match.end()),
        )
        for match in pattern.finditer(text)
    ]


ENGLISH_PARENS_RE = re.compile(
    r"(?P<before>[\u3400-\u9fff]?)\((?P<body>[^()\n]{0,80})\)(?P<after>[\u3400-\u9fff]?)"
)
ENGLISH_PUNCTUATION_RE = re.compile(
    r"(?<=[\u3400-\u9fff])[,;:!?](?=[\u3400-\u9fff\s]|$)"
    r"|(?<=[\u3400-\u9fff])\.(?=\s|$)"
)


def _english_parenthesis_issues(text: str) -> list[TextIssue]:
    issues: list[TextIssue] = []
    for match in ENGLISH_PARENS_RE.finditer(text):
        has_chinese_context = (
            match.group("before") or match.group("after") or HAN_RE.search(match.group("body"))
        )
        if not has_chinese_context:
            continue
        issues.append(
            TextIssue(
                rule="中文语境使用英文括号",
                line=_line_number(text, match.start()),
                excerpt=_excerpt(text, match.start(), match.end()),
            )
        )
    return issues


def find_document_issues(markdown: str) -> list[TextIssue]:
    """返回中文说明文档中可稳定识别的问题。"""
    text = markdown_prose(markdown)
    issues: list[TextIssue] = []
    patterns = (
        ("使用双星号强调", re.compile(r"\*\*")),
        ("使用中文双引号", re.compile(r"[“”]")),
        ("使用中文分号", re.compile(r"；")),
        ("使用长破折号", re.compile(r"——")),
        ("使用成对否定转折", re.compile(r"不是[^。！？\n]{0,60}(?:，|,)?而是")),
        ("中文语境使用英文标点", ENGLISH_PUNCTUATION_RE),
    )
    for rule, pattern in patterns:
        issues.extend(_regex_issues(text, rule, pattern))
    issues.extend(_english_parenthesis_issues(text))
    return sorted(issues, key=lambda issue: (issue.line, issue.rule))


KNOWN_SPEAKERS = (
    "林若宁",
    "陈星禾",
    "周明昭",
    "赵承宇",
    "顾行之",
    "沈砚川",
    "许闻舟",
)
SPEAKER_LABEL_RE = re.compile(
    rf"(?:{'|'.join(KNOWN_SPEAKERS)})(?:的[\u3400-\u9fffA-Za-z0-9+ ]{{1,12}})?"
    r"(?:说|问|答|喊|提醒|补充|判断|认为|说道|问道|答道|喊道|提醒道|补充道)?："
)
GENERIC_SPEECH_LABEL_RE = re.compile(
    r"[\u3400-\u9fff]{2,5}(?:的[\u3400-\u9fffA-Za-z0-9+ ]{1,12})?"
    r"(?:说|问|答|喊|说道|问道|答道|喊道|提醒道|补充道)："
)


def _speaker_labels(text: str) -> list[re.Match[str]]:
    matches = list(SPEAKER_LABEL_RE.finditer(text))
    occupied = [(match.start(), match.end()) for match in matches]
    matches.extend(
        match
        for match in GENERIC_SPEECH_LABEL_RE.finditer(text)
        if not any(start <= match.start() < end for start, end in occupied)
    )
    return sorted(matches, key=lambda match: match.start())


def find_dialogue_issues(text: str) -> list[TextIssue]:
    """检查一段会展示给玩家的文字，不评价术语或写作风格。"""
    if HAN_RE.search(text) is None:
        return []

    issues: list[TextIssue] = []
    patterns = (
        ("重复句末标点", re.compile(r"([。！？!?])\1+")),
        ("中英文句末标点叠用", re.compile(r"(?:。\.+|\.+。|！!+|!+！|？\?+|\?+？)")),
        ("句末标点后紧跟逗号", re.compile(r"[。！？][，,]")),
        ("中文语境使用英文标点", ENGLISH_PUNCTUATION_RE),
    )
    for rule, pattern in patterns:
        issues.extend(_regex_issues(text, rule, pattern))
    issues.extend(_english_parenthesis_issues(text))

    # 空行代表独立对白框。只在同一段里出现多位说话人时报告。
    for paragraph in re.finditer(r"(?:^|\n\s*\n)(?P<body>.*?)(?=\n\s*\n|$)", text, re.S):
        body = paragraph.group("body")
        body_labels = _speaker_labels(body)
        if len(body_labels) < 2:
            continue
        start = paragraph.start("body") + body_labels[1].start()
        end = paragraph.start("body") + body_labels[-1].end()
        issues.append(
            TextIssue(
                rule="单段合并多位说话人",
                line=_line_number(text, start),
                excerpt=_excerpt(text, start, end),
            )
        )
    return sorted(issues, key=lambda issue: (issue.line, issue.rule))


def _json_strings(value: Any, location: str = "$") -> Iterator[tuple[str, str]]:
    if isinstance(value, dict):
        for key, child in value.items():
            yield from _json_strings(child, f"{location}.{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            yield from _json_strings(child, f"{location}[{index}]")
    elif isinstance(value, str):
        yield location, value


def _json_line(source: str, value: str, start: int) -> tuple[int, int]:
    encoded = json.dumps(value, ensure_ascii=False)
    position = source.find(encoded, start)
    if position < 0:
        return 1, start
    return _line_number(source, position), position + len(encoded)


def json_text_samples(path: Path) -> Iterator[TextSample]:
    source = path.read_text(encoding="utf-8")
    data = json.loads(source)
    cursor = 0
    for location, value in _json_strings(data):
        line, cursor = _json_line(source, value, cursor)
        yield TextSample(path=path, line=line, text=value, location=location)


def _template_static_text(value: str) -> str:
    """移除模板表达式，只保留会原样展示的文字并保留换行数。"""
    output: list[str] = []
    index = 0
    while index < len(value):
        if not value.startswith("${", index):
            output.append(value[index])
            index += 1
            continue

        start = index
        index += 2
        depth = 1
        quote: str | None = None
        while index < len(value) and depth > 0:
            char = value[index]
            if quote is not None:
                if char == "\\" and index + 1 < len(value):
                    index += 2
                    continue
                if char == quote:
                    quote = None
                index += 1
                continue
            if char in {'"', "'", "`"}:
                quote = char
            elif char == "{":
                depth += 1
            elif char == "}":
                depth -= 1
            index += 1
        expression = value[start:index]
        output.append("\n" * expression.count("\n") or " ")
    return "".join(output)


def typescript_string_samples(path: Path) -> Iterator[TextSample]:
    """提取 TypeScript 字符串，跳过注释；模板表达式保留为占位文本。"""
    source = path.read_text(encoding="utf-8")
    index = 0
    while index < len(source):
        if source.startswith("//", index):
            newline = source.find("\n", index + 2)
            index = len(source) if newline < 0 else newline + 1
            continue
        if source.startswith("/*", index):
            closing = source.find("*/", index + 2)
            index = len(source) if closing < 0 else closing + 2
            continue
        quote = source[index]
        if quote not in {'"', "'", "`"}:
            index += 1
            continue

        start = index
        index += 1
        value: list[str] = []
        while index < len(source):
            char = source[index]
            if char == "\\" and index + 1 < len(source):
                value.extend((char, source[index + 1]))
                index += 2
                continue
            if char == quote:
                index += 1
                break
            value.append(char)
            index += 1
        literal = "".join(value)
        if quote == "`":
            literal = _template_static_text(literal)
        if HAN_RE.search(literal):
            yield TextSample(path=path, line=_line_number(source, start), text=literal)


JOIN_WITH_COMMA_RE = re.compile(r"\b(?P<name>[A-Za-z_$][\w$]*)\.join\(\s*(['\"])，\2\s*\)")


def find_merged_speaker_compositions(source: str) -> list[TextIssue]:
    """发现把多位带姓名的台词用逗号动态拼成一个段落的写法。"""
    issues: list[TextIssue] = []
    for join in JOIN_WITH_COMMA_RE.finditer(source):
        name = re.escape(join.group("name"))
        window_start = max(0, join.start() - 2400)
        window = source[window_start : join.start()]
        pushes = re.finditer(
            rf"\b{name}\.push\(\s*(?:`(?P<template>[^`]{{0,300}})`|"
            r"\"(?P<double>(?:\\.|[^\"\\]){0,300})\"|"
            r"'(?P<single>(?:\\.|[^'\\]){0,300})')\s*\)",
            window,
            re.S,
        )
        speaker_pushes = 0
        for push in pushes:
            argument = push.group("template") or push.group("double") or push.group("single") or ""
            if _speaker_labels(argument):
                speaker_pushes += 1
        if speaker_pushes < 2:
            continue
        issues.append(
            TextIssue(
                rule="用逗号动态合并多位说话人",
                line=_line_number(source, join.start()),
                excerpt=_excerpt(source, join.start(), join.end()),
            )
        )
    return issues


def document_paths(root: Path = PROJECT_ROOT) -> list[Path]:
    return [root / "README.md", root / "AGENTS.md", *sorted((root / "docs").glob("*.md"))]


def dialogue_paths(root: Path = PROJECT_ROOT) -> list[Path]:
    game = root / "src" / "game"
    return sorted(
        path
        for pattern in ("*.ts", "*.json")
        for path in game.rglob(pattern)
        if not path.name.endswith(".test.ts")
    )


def validate_repository(root: Path = PROJECT_ROOT) -> list[str]:
    messages: list[str] = []
    for path in document_paths(root):
        if not path.is_file():
            continue
        for issue in find_document_issues(path.read_text(encoding="utf-8")):
            messages.append(f"{path.relative_to(root)}:{issue.line} [{issue.rule}] {issue.excerpt}")

    for path in dialogue_paths(root):
        samples: Iterable[TextSample]
        if path.suffix == ".json":
            samples = json_text_samples(path)
        else:
            samples = typescript_string_samples(path)
            source = path.read_text(encoding="utf-8")
            for issue in find_merged_speaker_compositions(source):
                messages.append(
                    f"{path.relative_to(root)}:{issue.line} [{issue.rule}] {issue.excerpt}"
                )
        for sample in samples:
            for issue in find_dialogue_issues(sample.text):
                line = sample.line + issue.line - 1
                location = f" {sample.location}" if sample.location else ""
                messages.append(
                    f"{path.relative_to(root)}:{line}{location} [{issue.rule}] {issue.excerpt}"
                )
    return messages


def main() -> int:
    problems = validate_repository()
    if problems:
        print("文本质量检查未通过：", file=sys.stderr)
        for problem in problems:
            print(f"  - {problem}", file=sys.stderr)
        return 1
    print("文本质量检查通过。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
