"""Weighted ensemble of per-number probability vectors.

Every component returns a probability vector over ``00``-``99``. The blend is
``sum(w_i * p_i) / sum(w_i)``. ``uniform`` is included so users can see how
far each model moves away from pure chance (1% per number).
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence

import numpy as np

from app.engines import markov_engine, stats_engine

N_STATES = 100
COMPONENTS = ("frequency", "recency", "markov", "digit_markov", "gap", "uniform")
DEFAULT_WEIGHTS = {"frequency": 1.0, "recency": 1.0, "markov": 0.5, "digit_markov": 0.5, "gap": 0.5, "uniform": 1.0}


def component_scores(
    seq: Sequence[int],
    half_life: float = 20.0,
    markov_alpha: float = 0.1,
    window: int | None = None,
) -> dict[str, np.ndarray]:
    recent = list(seq[-window:]) if window else list(seq)
    gaps = stats_engine.gaps(recent).astype(float) + 1.0
    return {
        "frequency": stats_engine.smoothed_probabilities(stats_engine.frequency(recent)),
        "recency": stats_engine.recency_weighted(recent, half_life),
        "markov": markov_engine.next_distribution(recent, markov_alpha),
        "digit_markov": markov_engine.digit_markov_distribution(recent),
        "gap": gaps / gaps.sum(),
        "uniform": np.full(N_STATES, 1.0 / N_STATES),
    }


def blend(
    seq: Sequence[int],
    weights: Mapping[str, float] | None = None,
    half_life: float = 20.0,
    markov_alpha: float = 0.1,
    window: int | None = None,
) -> np.ndarray:
    weights = {k: max(0.0, float(v)) for k, v in (weights or DEFAULT_WEIGHTS).items() if k in COMPONENTS}
    total = sum(weights.values())
    if total <= 0:
        return np.full(N_STATES, 1.0 / N_STATES)
    scores = component_scores(seq, half_life, markov_alpha, window)
    out = np.zeros(N_STATES)
    for name, w in weights.items():
        if w > 0:
            out += w * scores[name]
    return out / total


def rank(scores: np.ndarray, top_k: int = 10) -> list[int]:
    """Indices of the ``top_k`` highest scores; ties broken by the smaller number."""
    return sorted(range(len(scores)), key=lambda i: (-scores[i], i))[:top_k]


def blend_report(seq: Sequence[int], weights: Mapping[str, float] | None = None, top_k: int = 10, **kwargs) -> dict:
    scores = blend(seq, weights, **kwargs)
    comps = component_scores(seq, kwargs.get("half_life", 20.0), kwargs.get("markov_alpha", 0.1), kwargs.get("window"))
    return {
        "scores": scores.round(6).tolist(),
        "top": [{"number": i, "score": round(float(scores[i]), 6), "lift": round(float(scores[i] * N_STATES), 4)} for i in rank(scores, top_k)],
        "components": {k: v.round(6).tolist() for k, v in comps.items()},
    }
