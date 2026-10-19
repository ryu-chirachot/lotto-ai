"""Historical dataset loader, seed generator and static exporter.

Canonical data lives in ``backend/data/{thai,lao}_draws.json``:

    {"lottery": "thai", "source": "...", "synthetic": false,
     "updated_at": "...", "draws": [{"date": "2024-01-17", "first_prize": "...", "last2": "..."}]}

CLI::

    python -m app.scrapers.seed_data update-thai          # incremental GLO fetch
    python -m app.scrapers.seed_data seed-lao              # synthetic Lao history
    python -m app.scrapers.seed_data import-lao FILE.csv   # real Lao data: date,last2
    python -m app.scrapers.seed_data export                # write frontend/public/data
"""

from __future__ import annotations

import argparse
import csv
import json
import random
from datetime import UTC, date, datetime, timedelta
from pathlib import Path

from app.config import settings

LOTTERIES = ("thai", "lao")
SOURCES = {
    "thai": "Government Lottery Office (glo.or.th) public results API",
    "lao": "Synthetic uniform-random seed data (not real results)",
}


def data_path(lottery: str) -> Path:
    return settings.data_dir / f"{lottery}_draws.json"


def load(lottery: str) -> dict:
    path = data_path(lottery)
    if not path.exists():
        return {"lottery": lottery, "source": SOURCES[lottery], "synthetic": lottery == "lao", "updated_at": None, "draws": []}
    return json.loads(path.read_text(encoding="utf-8"))


def save(dataset: dict) -> Path:
    dataset["draws"] = sorted({d["date"]: d for d in dataset["draws"]}.values(), key=lambda d: d["date"])
    dataset["updated_at"] = datetime.now(UTC).isoformat(timespec="seconds")
    path = data_path(dataset["lottery"])
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(dataset, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    return path


def update_thai() -> int:
    from app.scrapers import glo

    dataset = load("thai")
    new_rows = glo.scrape_incremental(dataset["draws"])
    if new_rows or not data_path("thai").exists():
        dataset["draws"].extend(new_rows)
        save(dataset)
    return len(new_rows)


def lao_draw_dates(start: date, end: date) -> list[date]:
    """Lao Development Lottery draws Monday, Wednesday and Friday."""
    out, day = [], start
    while day <= end:
        if day.weekday() in (0, 2, 4):
            out.append(day)
        day += timedelta(days=1)
    return out


def generate_lao(start: date = date(2021, 1, 4), end: date | None = None, seed: int = 2024) -> dict:
    """Uniform random 2-digit results on the real Mon/Wed/Fri schedule.

    A fair draw is uniform, so this is a realistic null-hypothesis dataset,
    but it is NOT historical data. The frontend labels it as synthetic.
    """
    rng = random.Random(seed)
    end = end or date.today()
    draws = [{"date": d.isoformat(), "last2": f"{rng.randrange(100):02d}"} for d in lao_draw_dates(start, end)]
    return {"lottery": "lao", "source": SOURCES["lao"], "synthetic": True, "updated_at": None, "draws": draws}


def import_lao_csv(path: Path, source: str) -> int:
    """Replace Lao data with real results from a ``date,last2`` CSV (ISO dates)."""
    draws = []
    with path.open(encoding="utf-8-sig", newline="") as fh:
        for row in csv.DictReader(fh):
            day = date.fromisoformat(row["date"].strip()).isoformat()
            last2 = row["last2"].strip().zfill(2)
            if len(last2) != 2 or not last2.isdigit():
                raise ValueError(f"Bad last2 value {row['last2']!r} on {day}")
            draws.append({"date": day, "last2": last2})
    save({"lottery": "lao", "source": source, "synthetic": False, "updated_at": None, "draws": draws})
    return len(draws)


def export_static(out_dir: Path | None = None) -> list[Path]:
    """Copy datasets to the frontend so GitHub Pages can serve them as static JSON."""
    out_dir = out_dir or settings.static_export_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    written = []
    for lottery in LOTTERIES:
        dataset = load(lottery)
        target = out_dir / f"{lottery}.json"
        target.write_text(json.dumps(dataset, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        written.append(target)
    return written


def main() -> None:
    parser = argparse.ArgumentParser(prog="python -m app.scrapers.seed_data")
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("update-thai", help="Fetch new Thai results from the GLO API")
    lao = sub.add_parser("seed-lao", help="Generate synthetic Lao history up to today")
    lao.add_argument("--seed", type=int, default=2024)
    imp = sub.add_parser("import-lao", help="Import real Lao results from CSV (date,last2)")
    imp.add_argument("file", type=Path)
    imp.add_argument("--source", default="Imported CSV")
    sub.add_parser("export", help="Write static JSON for the frontend")
    args = parser.parse_args()

    if args.cmd == "update-thai":
        print(f"Added {update_thai()} new Thai draws")
    elif args.cmd == "seed-lao":
        existing = load("lao")
        if existing["draws"] and not existing.get("synthetic", True):
            raise SystemExit("Lao data is real (imported); refusing to overwrite with synthetic data")
        print(f"Wrote {save(generate_lao(seed=args.seed))}")
    elif args.cmd == "import-lao":
        print(f"Imported {import_lao_csv(args.file, args.source)} Lao draws")
    elif args.cmd == "export":
        for path in export_static():
            print(f"Wrote {path}")


if __name__ == "__main__":
    main()
