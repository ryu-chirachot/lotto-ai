"""Descriptive statistics for 2-digit and 6-digit draws.

All functions take draws in chronological order (oldest first). 2-digit draws
are ints in ``[0, 99]``; 6-digit draws are zero-padded strings.
"""

from __future__ import annotations

from collections.abc import Sequence

import numpy as np
from scipy import stats

N_STATES = 100


def frequency(numbers: Sequence[int], n_states: int = N_STATES) -> np.ndarray:
    return np.bincount(np.asarray(numbers, dtype=int), minlength=n_states).astype(float)


def smoothed_probabilities(counts: np.ndarray, alpha: float = 1.0) -> np.ndarray:
    """Additive (Laplace) smoothing so unseen numbers keep non-zero mass."""
    smoothed = counts + alpha
    return smoothed / smoothed.sum()


def recency_weighted(numbers: Sequence[int], half_life: float = 20.0, n_states: int = N_STATES) -> np.ndarray:
    """Exponentially-decayed frequency: a draw ``half_life`` draws ago counts half."""
    weights = np.zeros(n_states)
    n = len(numbers)
    if n == 0:
        return np.full(n_states, 1.0 / n_states)
    decay = 0.5 ** (1.0 / max(half_life, 1e-9))
    ages = np.arange(n - 1, -1, -1)
    np.add.at(weights, np.asarray(numbers, dtype=int), decay**ages)
    weights += 1e-3  # keep every state reachable
    return weights / weights.sum()


def gaps(numbers: Sequence[int], n_states: int = N_STATES) -> np.ndarray:
    """Draws elapsed since each number last appeared (``len(numbers)`` if never)."""
    n = len(numbers)
    out = np.full(n_states, n, dtype=int)
    for idx, value in enumerate(numbers):
        out[value] = n - 1 - idx
    return out


def chi_square_uniformity(counts: np.ndarray) -> dict:
    """Pearson chi-square goodness-of-fit against a uniform distribution.

    A large p-value means the observed counts are consistent with pure chance.
    """
    total = counts.sum()
    if total == 0:
        return {"statistic": 0.0, "p_value": 1.0, "dof": len(counts) - 1}
    result = stats.chisquare(counts)
    return {"statistic": float(result.statistic), "p_value": float(result.pvalue), "dof": len(counts) - 1}


def hot_cold(numbers: Sequence[int], window: int | None = None, top_k: int = 10) -> dict:
    """Most/least frequent numbers in the last ``window`` draws, with binomial z-scores."""
    recent = list(numbers[-window:]) if window else list(numbers)
    counts = frequency(recent)
    n = len(recent)
    p = 1.0 / N_STATES
    expected = n * p
    sd = np.sqrt(n * p * (1 - p)) or 1.0
    z = (counts - expected) / sd
    order_hot = sorted(range(N_STATES), key=lambda i: (-counts[i], i))
    order_cold = sorted(range(N_STATES), key=lambda i: (counts[i], i))

    def row(i: int) -> dict:
        return {"number": i, "count": int(counts[i]), "z": round(float(z[i]), 3)}

    return {
        "window": n,
        "expected": expected,
        "hot": [row(i) for i in order_hot[:top_k]],
        "cold": [row(i) for i in order_cold[:top_k]],
    }


def positional_frequency(six_digit: Sequence[str]) -> np.ndarray:
    """6x10 matrix: how often digit ``d`` appeared at position ``p``."""
    counts = np.zeros((6, 10))
    for number in six_digit:
        for pos, ch in enumerate(number):
            counts[pos, int(ch)] += 1
    return counts


def positional_chi_square(counts: np.ndarray) -> list[dict]:
    return [chi_square_uniformity(row) for row in counts]


def summary_2d(numbers: Sequence[int], window: int | None = None, top_k: int = 10) -> dict:
    recent = list(numbers[-window:]) if window else list(numbers)
    counts = frequency(recent)
    return {
        "n_draws": len(recent),
        "counts": counts.astype(int).tolist(),
        "probabilities": smoothed_probabilities(counts).round(6).tolist(),
        "gaps": gaps(recent).tolist(),
        "hot_cold": hot_cold(recent, top_k=top_k),
        "chi_square": chi_square_uniformity(counts),
        "tens_counts": np.bincount(np.asarray(recent, dtype=int) // 10, minlength=10).tolist(),
        "units_counts": np.bincount(np.asarray(recent, dtype=int) % 10, minlength=10).tolist(),
    }


def summary_6d(six_digit: Sequence[str], window: int | None = None) -> dict:
    recent = list(six_digit[-window:]) if window else list(six_digit)
    counts = positional_frequency(recent)
    digit_sums = [sum(int(c) for c in s) for s in recent]
    return {
        "n_draws": len(recent),
        "positional_counts": counts.astype(int).tolist(),
        "positional_chi_square": positional_chi_square(counts),
        "digit_sum_hist": np.bincount(np.asarray(digit_sums, dtype=int), minlength=55).tolist() if recent else [0] * 55,
        "digit_sum_mean": float(np.mean(digit_sums)) if recent else 0.0,
    }
