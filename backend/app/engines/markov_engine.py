"""First-order Markov models over 2-digit draws.

``transition_matrix`` is the full 100x100 model the spec asks for. With only a
few hundred draws it is extremely sparse (10,000 cells), so smoothing dominates
and the next-state row is close to uniform. ``digit_markov_distribution``
models the tens and units digits as two independent 10x10 chains, which needs
far less data to estimate.
"""

from __future__ import annotations

from collections.abc import Sequence

import numpy as np

N_STATES = 100


def transition_counts(seq: Sequence[int], n_states: int = N_STATES) -> np.ndarray:
    counts = np.zeros((n_states, n_states))
    arr = np.asarray(seq, dtype=int)
    if len(arr) >= 2:
        np.add.at(counts, (arr[:-1], arr[1:]), 1)
    return counts


def transition_matrix(seq: Sequence[int], n_states: int = N_STATES, alpha: float = 0.1) -> np.ndarray:
    """Row-stochastic matrix ``P[i, j] = P(next=j | current=i)`` with additive smoothing."""
    counts = transition_counts(seq, n_states) + alpha
    return counts / counts.sum(axis=1, keepdims=True)


def next_distribution(seq: Sequence[int], alpha: float = 0.1, n_states: int = N_STATES) -> np.ndarray:
    if len(seq) == 0:
        return np.full(n_states, 1.0 / n_states)
    counts = transition_counts(seq, n_states)
    row = counts[seq[-1]] + alpha
    return row / row.sum()


def digit_markov_distribution(seq: Sequence[int], alpha: float = 1.0) -> np.ndarray:
    """P(next) = P(tens' | tens) * P(units' | units), each a smoothed 10x10 chain."""
    if len(seq) == 0:
        return np.full(N_STATES, 1.0 / N_STATES)
    arr = np.asarray(seq, dtype=int)
    tens_row = transition_counts(arr // 10, 10)[arr[-1] // 10] + alpha
    units_row = transition_counts(arr % 10, 10)[arr[-1] % 10] + alpha
    dist = np.outer(tens_row / tens_row.sum(), units_row / units_row.sum()).ravel()
    return dist / dist.sum()


def stationary_distribution(matrix: np.ndarray, iterations: int = 500, tol: float = 1e-12) -> np.ndarray:
    n = matrix.shape[0]
    pi = np.full(n, 1.0 / n)
    for _ in range(iterations):
        nxt = pi @ matrix
        if np.abs(nxt - pi).sum() < tol:
            return nxt
        pi = nxt
    return pi


def markov_summary(seq: Sequence[int], alpha: float = 0.1, top_k: int = 10) -> dict:
    counts = transition_counts(seq)
    dist = next_distribution(seq, alpha)
    digit_dist = digit_markov_distribution(seq)
    order = sorted(range(N_STATES), key=lambda i: (-dist[i], i))
    digit_order = sorted(range(N_STATES), key=lambda i: (-digit_dist[i], i))
    return {
        "current_state": int(seq[-1]) if len(seq) else None,
        "n_transitions": int(counts.sum()),
        "observed_cells": int((counts > 0).sum()),
        "sparsity": float(1 - (counts > 0).sum() / counts.size),
        "row_counts": counts[seq[-1]].astype(int).tolist() if len(seq) else [0] * N_STATES,
        "next_distribution": dist.round(6).tolist(),
        "digit_next_distribution": digit_dist.round(6).tolist(),
        "top_next": [{"number": i, "p": round(float(dist[i]), 6)} for i in order[:top_k]],
        "top_next_digit": [{"number": i, "p": round(float(digit_dist[i]), 6)} for i in digit_order[:top_k]],
    }
