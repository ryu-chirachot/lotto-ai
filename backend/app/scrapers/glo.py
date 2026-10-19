"""Thai Government Lottery results from the GLO public API (www.glo.or.th).

Draws normally happen on the 1st and 16th, but some are moved (e.g. 17 Jan,
2 May, 30 Dec), so we probe a small set of candidate days per month and keep
whatever date the API reports back. The API has results from March 2010.
"""

from __future__ import annotations

import time
from datetime import date, timedelta

import httpx

from app.config import settings

CANDIDATE_DAYS = (1, 2, 3, 15, 16, 17, 30, 31)  # e.g. 31 Jul 2023, 30 Dec
DECEMBER_EXTRA_DAYS = (28, 29)
EARLIEST_YEAR = 2010


def fetch_result(client: httpx.Client, day: date) -> dict | None:
    """Return ``{"date", "first_prize", "last2"}`` for a draw date, or None."""
    resp = client.post(
        f"{settings.glo_api_base}/checking/getLotteryResult",
        json={"date": f"{day.day:02d}", "month": f"{day.month:02d}", "year": str(day.year)},
    )
    resp.raise_for_status()
    payload = resp.json().get("response")
    if not payload or not payload.get("result"):
        return None
    result = payload["result"]
    data = result.get("data") or {}
    try:
        first = data["first"]["number"][0]["value"]
        last2 = data["last2"]["number"][0]["value"]
    except (KeyError, IndexError, TypeError):
        return None
    if not (len(first) == 6 and first.isdigit() and len(last2) == 2 and last2.isdigit()):
        return None
    return {"date": result["date"], "first_prize": first, "last2": last2}


def candidate_dates(start: date, end: date) -> list[date]:
    out: list[date] = []
    year, month = start.year, start.month
    while (year, month) <= (end.year, end.month):
        days = CANDIDATE_DAYS + (DECEMBER_EXTRA_DAYS if month == 12 else ())
        for d in days:
            try:
                candidate = date(year, month, d)
            except ValueError:
                continue
            if start <= candidate <= end:
                out.append(candidate)
        month += 1
        if month > 12:
            year, month = year + 1, 1
    return out


def scrape(since: date | None = None, until: date | None = None, delay: float = 0.15) -> list[dict]:
    """Fetch every Thai draw in ``[since, until]``. Results are de-duplicated by date."""
    until = until or date.today()
    since = since or date(EARLIEST_YEAR, 1, 1)
    found: dict[str, dict] = {}
    with httpx.Client(timeout=settings.http_timeout, headers={"User-Agent": "lotto-ai/1.0"}) as client:
        for day in candidate_dates(since, until):
            for attempt in range(3):
                try:
                    row = fetch_result(client, day)
                    break
                except httpx.HTTPError:
                    if attempt == 2:
                        raise
                    time.sleep(2 * (attempt + 1))
            if row:
                found[row["date"]] = row
            time.sleep(delay)
    return [found[k] for k in sorted(found)]


def scrape_incremental(existing: list[dict]) -> list[dict]:
    """Return only draws newer than the latest one in ``existing``."""
    if not existing:
        return scrape()
    last = date.fromisoformat(max(r["date"] for r in existing))
    known = {r["date"] for r in existing}
    return [r for r in scrape(since=last + timedelta(days=1)) if r["date"] not in known]
