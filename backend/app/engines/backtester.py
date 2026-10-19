"""Walk-forward backtest of the blended scorer.

For each draw ``t`` after ``min_history`` draws, the model only sees
``seq[:t]``, picks its ``top_k`` numbers, and we record whether ``seq[t]``
was among them. Hit rate is compared with the random baseline ``top_k / 100``
using a one-sided binomial test.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence

from scipy import stats

from app.engines import blender

N_STATES = 100


def backtest(
    seq: Sequence[int],
    weights: Mapping[str, float] | None = None,
    top_k: int = 10,
    min_history: int = 30,
    stake: float = 80.0,
    payout: float = 2000.0,
    half_life: float = 20.0,
    markov_alpha: float = 0.1,
    window: int | None = None,
    dates: Sequence[str] | None = None,
) -> dict:
    """``stake`` is the cost of one number per draw; ``payout`` is paid on a hit."""
    top_k = max(1, min(N_STATES, top_k))
    min_history = max(1, min_history)
    series = []
    hits = 0
    cost = 0.0
    revenue = 0.0
    for t in range(min_history, len(seq)):
        scores = blender.blend(seq[:t], weights, half_life, markov_alpha, window)
        picks = blender.rank(scores, top_k)
        hit = seq[t] in picks
        hits += hit
        cost += stake * top_k
        revenue += payout if hit else 0.0
        n = t - min_history + 1
        series.append(
            {
                "index": t,
                "date": dates[t] if dates else None,
                "actual": int(seq[t]),
                "hit": bool(hit),
                "cum_hits": hits,
                "cum_expected": round(n * top_k / N_STATES, 4),
                "cum_roi": round((revenue - cost) / cost, 6),
            }
        )
    n_tests = len(series)
    baseline = top_k / N_STATES
    p_value = float(stats.binomtest(hits, n_tests, baseline, alternative="greater").pvalue) if n_tests else 1.0
    return {
        "n_tests": n_tests,
        "hits": hits,
        "hit_rate": hits / n_tests if n_tests else 0.0,
        "baseline_rate": baseline,
        "p_value": p_value,
        "total_cost": cost,
        "total_return": revenue,
        "roi": (revenue - cost) / cost if cost else 0.0,
        "series": series,
    }
