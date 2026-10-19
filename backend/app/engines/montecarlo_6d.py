"""Monte Carlo sampler for the 6-digit First Prize.

Each position is sampled independently from its smoothed historical digit
distribution (optionally mixed with uniform), then filtered by user
constraints via rejection sampling. Accepted candidates are ranked by their
likelihood under that positional model. Every real ticket still has a
1-in-1,000,000 chance; ``lift`` shows how much the model prefers a number
over that baseline.
"""

from __future__ import annotations

from collections import Counter
from collections.abc import Sequence
from dataclasses import dataclass, field

import numpy as np

from app.engines import stats_engine


@dataclass
class Constraints:
    sum_min: int = 0
    sum_max: int = 54
    max_repeat: int = 6  # max occurrences of any single digit
    even_min: int = 0
    even_max: int = 6
    fixed: dict[int, int] = field(default_factory=dict)  # position -> digit
    exclude_digits: list[int] = field(default_factory=list)

    def accepts(self, digits: np.ndarray) -> np.ndarray:
        """Vectorised check over an ``(n, 6)`` digit array."""
        sums = digits.sum(axis=1)
        evens = (digits % 2 == 0).sum(axis=1)
        repeat = np.stack([(digits == d).sum(axis=1) for d in range(10)], axis=1).max(axis=1)
        return (
            (sums >= self.sum_min)
            & (sums <= self.sum_max)
            & (evens >= self.even_min)
            & (evens <= self.even_max)
            & (repeat <= self.max_repeat)
        )


def positional_probabilities(
    first_prizes: Sequence[str],
    alpha: float = 1.0,
    uniform_mix: float = 0.0,
    constraints: Constraints | None = None,
) -> np.ndarray:
    counts = stats_engine.positional_frequency(first_prizes) + alpha
    probs = counts / counts.sum(axis=1, keepdims=True)
    probs = (1 - uniform_mix) * probs + uniform_mix / 10
    if constraints:
        for d in constraints.exclude_digits:
            probs[:, d] = 0.0
        for pos, d in constraints.fixed.items():
            probs[pos] = 0.0
            probs[pos, d] = 1.0
    row_sums = probs.sum(axis=1, keepdims=True)
    if np.any(row_sums == 0):
        raise ValueError("Constraints leave a position with no allowed digit")
    return probs / row_sums


def simulate(
    first_prizes: Sequence[str],
    n_sims: int = 20000,
    alpha: float = 1.0,
    uniform_mix: float = 0.0,
    constraints: Constraints | None = None,
    top_k: int = 20,
    seed: int | None = None,
) -> dict:
    constraints = constraints or Constraints()
    rng = np.random.default_rng(seed)
    probs = positional_probabilities(first_prizes, alpha, uniform_mix, constraints)
    cdf = probs.cumsum(axis=1)
    u = rng.random((n_sims, 6))
    digits = np.stack([np.searchsorted(cdf[p], u[:, p], side="right") for p in range(6)], axis=1)
    digits = np.minimum(digits, 9)
    accepted = digits[constraints.accepts(digits)]

    log_p = np.log(probs + 1e-300)
    numbers = ["".join(map(str, row)) for row in accepted]
    freq = Counter(numbers)
    unique = sorted(freq)
    loglik = {s: float(sum(log_p[p, int(ch)] for p, ch in enumerate(s))) for s in unique}
    ranked = sorted(unique, key=lambda s: (-loglik[s], s))[:top_k]
    sums = accepted.sum(axis=1) if len(accepted) else np.array([], dtype=int)
    return {
        "n_sims": n_sims,
        "accepted": int(len(accepted)),
        "acceptance_rate": float(len(accepted) / n_sims) if n_sims else 0.0,
        "unique": len(unique),
        "positional_probabilities": probs.round(6).tolist(),
        "candidates": [
            {
                "number": s,
                "hits": freq[s],
                "likelihood": float(np.exp(loglik[s])),
                "lift": float(np.exp(loglik[s]) * 1e6),
            }
            for s in ranked
        ],
        "digit_sum_hist": np.bincount(sums, minlength=55).tolist() if len(sums) else [0] * 55,
    }
