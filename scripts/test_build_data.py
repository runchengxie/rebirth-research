"""测试 build_data.py 中不依赖真实行情库的逻辑。"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_data  # noqa: E402


class TestDuckDBPath:
    def test_windows_path_is_converted(self) -> None:
        assert build_data.duckdb_path(r"C:\data\a_share\daily") == "C:/data/a_share/daily"

    def test_posix_path_is_preserved(self) -> None:
        assert build_data.duckdb_path("/home/user/data/daily") == "/home/user/data/daily"

    def test_path_object_is_supported(self) -> None:
        assert build_data.duckdb_path(Path("/data") / "daily") == "/data/daily"


class TestAsFloat:
    @pytest.mark.parametrize(
        ("value", "expected"),
        [
            (3.14, 3.14),
            (-0.05, -0.05),
            (0, 0.0),
            ("1.5", 1.5),
            ("-2", -2.0),
        ],
    )
    def test_finite_values_are_converted(self, value: object, expected: float) -> None:
        assert build_data.as_float(value) == expected

    @pytest.mark.parametrize("value", [None, float("nan"), float("inf"), float("-inf")])
    def test_missing_or_non_finite_values_return_none(self, value: object) -> None:
        assert build_data.as_float(value) is None

    def test_rounding_is_optional(self) -> None:
        assert build_data.as_float(3.14159, 2) == 3.14
        assert build_data.as_float(3.14159, 0) == 3.0
        assert build_data.as_float(None, 4) is None


class TestParseArgs:
    def test_defaults(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr(sys, "argv", ["build_data.py"])
        config = build_data.parse_args()
        assert config.years == [2023, 2024, 2025]
        assert config.price_column == "adj_close"
        assert config.seed == 20240706
        assert config.out_dir == "data"

    def test_custom_values(self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
        output = tmp_path / "market-review"
        monkeypatch.setattr(
            sys,
            "argv",
            [
                "build_data.py",
                "--years",
                "2024",
                "2025",
                "--daily-clean-dir",
                "/tmp/daily",
                "--instruments",
                "/tmp/instruments.parquet",
                "--out-dir",
                str(output),
                "--price-column",
                "close",
                "--seed",
                "42",
            ],
        )
        config = build_data.parse_args()
        assert config.years == [2024, 2025]
        assert config.daily_clean_dir == "/tmp/daily"
        assert config.instruments == "/tmp/instruments.parquet"
        assert config.out_dir == str(output)
        assert config.price_column == "close"
        assert config.seed == 42


class TestBuildYearPayload:
    def test_combines_index_sector_and_factor_results(
        self,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        monkeypatch.setattr(
            build_data,
            "query_index_returns",
            lambda *_args: [
                {
                    "month_key": "202501",
                    "market_start": "20250102",
                    "market_end": "20250127",
                    "market_days": 18,
                    "hs300_return": 0.01234,
                    "zz500_return": -0.004,
                }
            ],
        )
        monkeypatch.setattr(
            build_data,
            "query_sector_rotation",
            lambda *_args: {
                "202501": [
                    {
                        "industry": "电子",
                        "return_rate": 0.11,
                        "rank_desc": 1,
                        "rank_asc": 10,
                    },
                    {
                        "industry": "煤炭",
                        "return_rate": -0.08,
                        "rank_desc": 10,
                        "rank_asc": 1,
                    },
                ]
            },
        )
        monkeypatch.setattr(
            build_data,
            "query_style_factors",
            lambda *_args: [
                {
                    "month_key": "202501",
                    "size_premium": 0.021,
                    "momentum_premium": -0.013,
                }
            ],
        )
        config = build_data.Config(
            years=[2025],
            daily_clean_dir="/tmp/daily",
            instruments="/tmp/instruments.parquet",
            out_dir="/tmp/out",
            price_column="adj_close",
            seed=1,
        )

        payload = build_data.build_year_payload(config, object(), 2025)

        assert payload["year"] == 2025
        assert payload["source"] == {
            "dailyDataset": "a_share_daily_clean",
            "priceColumn": "adj_close",
        }
        benchmark = payload["benchmarks"][0]
        assert benchmark["month"] == "2025-01"
        assert benchmark["themeReturn"] == 0.0123
        assert benchmark["sectorRotation"] == [
            {"sector": "电子", "returnRate": 0.11, "rank": 1},
            {"sector": "煤炭", "returnRate": -0.08, "rank": -1},
        ]
        assert benchmark["styleFactorReturns"] == [
            {"factor": "size", "returnRate": 0.021, "direction": "小盘溢价"},
            {"factor": "momentum", "returnRate": -0.013, "direction": "反转占优"},
        ]


class FakeConnection:
    def __init__(self) -> None:
        self.closed = False

    def close(self) -> None:
        self.closed = True


class FakeDuckDB:
    def __init__(self, connection: FakeConnection) -> None:
        self.connection = connection

    def connect(self, target: str) -> FakeConnection:
        assert target == ":memory:"
        return self.connection


class TestMain:
    def test_writes_year_files_and_manifest(
        self,
        monkeypatch: pytest.MonkeyPatch,
        tmp_path: Path,
    ) -> None:
        connection = FakeConnection()
        monkeypatch.setattr(build_data, "require_duckdb", lambda: FakeDuckDB(connection))

        def fake_payload(_config: build_data.Config, _connection: Any, year: int) -> dict[str, Any]:
            return {
                "year": year,
                "currency": "CNY",
                "generatedAt": "2026-07-12T00:00:00+00:00",
                "source": {"dailyDataset": "test", "priceColumn": "adj_close"},
                "rules": {},
                "benchmarks": [],
            }

        monkeypatch.setattr(build_data, "build_year_payload", fake_payload)
        monkeypatch.setattr(
            sys,
            "argv",
            [
                "build_data.py",
                "--years",
                "2024",
                "2025",
                "--out-dir",
                str(tmp_path),
            ],
        )

        build_data.main()

        assert connection.closed is True
        for year in (2024, 2025):
            path = tmp_path / f"market-review-{year}.json"
            assert json.loads(path.read_text(encoding="utf-8"))["year"] == year

        manifest = json.loads(
            (tmp_path / "market-review-manifest.json").read_text(encoding="utf-8")
        )
        assert manifest["years"] == [2024, 2025]
        assert manifest["files"] == [
            "market-review-2024.json",
            "market-review-2025.json",
        ]
