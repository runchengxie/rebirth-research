"""测试 data/ 静态股票选项数据的校验逻辑。"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import validate_data  # noqa: E402


def make_option(code: str, return_rate: float, *, is_best: bool = False) -> dict[str, Any]:
    return {
        "id": code,
        "tsCode": code,
        "name": code,
        "returnRate": return_rate,
        "isBest": is_best,
    }


def make_year_payload(year: int) -> dict[str, Any]:
    initial_capital = 10000.0
    perfect_capital = initial_capital
    months: list[dict[str, Any]] = []
    for month in range(1, 13):
        best_code = f"BEST{month:02d}"
        best_return = round(0.01 + month / 1000, 6)
        options = [
            make_option(best_code, best_return, is_best=True),
            make_option(f"A{month:02d}", 0.001),
            make_option(f"B{month:02d}", -0.002),
            make_option(f"C{month:02d}", 0.0),
        ]
        perfect_capital *= 1 + best_return
        months.append(
            {
                "month": f"{year}-{month:02d}",
                "label": f"{year}年{month}月",
                "best": {"tsCode": best_code, "returnRate": best_return},
                "options": options,
            }
        )
    return {
        "year": year,
        "initialCapital": initial_capital,
        "perfectCapital": round(perfect_capital, 2),
        "source": {"dailyDataset": "test"},
        "months": months,
    }


def write_json(path: Path, value: object) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")


class TestValidateYearFile:
    def test_accepts_a_complete_year(self, tmp_path: Path) -> None:
        path = tmp_path / "2025.json"
        write_json(path, make_year_payload(2025))
        year, payload = validate_data.validate_year_file(path)
        assert year == 2025
        assert len(payload["months"]) == 12

    def test_rejects_file_name_mismatch(self, tmp_path: Path) -> None:
        path = tmp_path / "2024.json"
        write_json(path, make_year_payload(2025))
        with pytest.raises(ValueError, match="file name does not match"):
            validate_data.validate_year_file(path)

    def test_rejects_duplicate_options(self, tmp_path: Path) -> None:
        payload = make_year_payload(2025)
        payload["months"][0]["options"][1]["tsCode"] = payload["months"][0]["options"][0]["tsCode"]
        path = tmp_path / "2025.json"
        write_json(path, payload)
        with pytest.raises(ValueError, match="duplicate option"):
            validate_data.validate_year_file(path)

    def test_rejects_wrong_best_marker(self, tmp_path: Path) -> None:
        payload = make_year_payload(2025)
        payload["months"][0]["options"][0]["isBest"] = False
        payload["months"][0]["options"][1]["isBest"] = True
        path = tmp_path / "2025.json"
        write_json(path, payload)
        with pytest.raises(ValueError, match="isBest option does not match"):
            validate_data.validate_year_file(path)

    def test_rejects_incorrect_perfect_capital(self, tmp_path: Path) -> None:
        payload = make_year_payload(2025)
        payload["perfectCapital"] += 1
        path = tmp_path / "2025.json"
        write_json(path, payload)
        with pytest.raises(ValueError, match="perfectCapital mismatch"):
            validate_data.validate_year_file(path)

    def test_rejects_local_paths(self, tmp_path: Path) -> None:
        payload = make_year_payload(2025)
        payload["source"]["path"] = r"C:\private\market-data"
        path = tmp_path / "2025.json"
        write_json(path, payload)
        with pytest.raises(ValueError, match="local filesystem path"):
            validate_data.validate_year_file(path)


class TestJavaScriptBundle:
    def test_loads_the_expected_assignment(self, tmp_path: Path) -> None:
        path = tmp_path / "game-data.js"
        path.write_text(
            'window.REBIRTH_GAME_DATA = {"2025": {"year": 2025}};\n',
            encoding="utf-8",
        )
        assert validate_data.load_js_bundle(path) == {"2025": {"year": 2025}}

    def test_rejects_other_javascript(self, tmp_path: Path) -> None:
        path = tmp_path / "game-data.js"
        path.write_text("console.log('x');\n", encoding="utf-8")
        with pytest.raises(ValueError, match="expected"):
            validate_data.load_js_bundle(path)


class TestMain:
    def test_validates_manifest_years_and_bundle(
        self,
        monkeypatch: pytest.MonkeyPatch,
        tmp_path: Path,
    ) -> None:
        payload = make_year_payload(2025)
        write_json(tmp_path / "2025.json", payload)
        write_json(
            tmp_path / "manifest.json",
            {"years": [2025], "files": ["2025.json"]},
        )
        (tmp_path / "game-data.js").write_text(
            f"window.REBIRTH_GAME_DATA = {json.dumps({'2025': payload}, ensure_ascii=False)};\n",
            encoding="utf-8",
        )
        monkeypatch.setattr(validate_data, "DATA_DIR", tmp_path)
        assert validate_data.main() == 0

    def test_rejects_manifest_year_mismatch(
        self,
        monkeypatch: pytest.MonkeyPatch,
        tmp_path: Path,
    ) -> None:
        payload = make_year_payload(2025)
        write_json(tmp_path / "2025.json", payload)
        write_json(
            tmp_path / "manifest.json",
            {"years": [2024], "files": ["2025.json"]},
        )
        (tmp_path / "game-data.js").write_text(
            f"window.REBIRTH_GAME_DATA = {json.dumps({'2025': payload}, ensure_ascii=False)};\n",
            encoding="utf-8",
        )
        monkeypatch.setattr(validate_data, "DATA_DIR", tmp_path)
        with pytest.raises(ValueError, match="manifest years do not match"):
            validate_data.main()
