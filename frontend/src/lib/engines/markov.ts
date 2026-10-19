// Port of backend/app/engines/markov_engine.py.

import type { MarkovResponse } from "../types";
import { normalize, round } from "./mathutil";
import { N_STATES } from "./stats";

/** Counts of the states that followed ``from`` in ``seq``. */
function rowCounts(seq: number[], from: number, nStates: number): number[] {
  const row = new Array(nStates).fill(0);
  for (let i = 0; i < seq.length - 1; i++) if (seq[i] === from) row[seq[i + 1]] += 1;
  return row;
}

export function nextDistribution(seq: number[], alpha = 0.1, nStates = N_STATES): number[] {
  if (seq.length === 0) return new Array(nStates).fill(1 / nStates);
  return normalize(rowCounts(seq, seq[seq.length - 1], nStates).map((c) => c + alpha));
}

export function digitMarkovDistribution(seq: number[], alpha = 1): number[] {
  if (seq.length === 0) return new Array(N_STATES).fill(1 / N_STATES);
  const tens = seq.map((n) => Math.floor(n / 10));
  const units = seq.map((n) => n % 10);
  const t = normalize(rowCounts(tens, tens[tens.length - 1], 10).map((c) => c + alpha));
  const u = normalize(rowCounts(units, units[units.length - 1], 10).map((c) => c + alpha));
  const out: number[] = [];
  for (let i = 0; i < 10; i++) for (let j = 0; j < 10; j++) out.push(t[i] * u[j]);
  return normalize(out);
}

export function markovSummary(seq: number[], alpha = 0.1, topK = 10): MarkovResponse {
  const observed = new Set<number>();
  for (let i = 0; i < seq.length - 1; i++) observed.add(seq[i] * N_STATES + seq[i + 1]);
  const dist = nextDistribution(seq, alpha);
  const digit = digitMarkovDistribution(seq);
  const idx = [...Array(N_STATES).keys()];
  const top = (d: number[]) =>
    [...idx]
      .sort((a, b) => d[b] - d[a] || a - b)
      .slice(0, topK)
      .map((i) => ({ number: i, p: round(d[i]) }));
  const last = seq.length ? seq[seq.length - 1] : null;
  return {
    current_state: last,
    n_transitions: Math.max(0, seq.length - 1),
    observed_cells: observed.size,
    sparsity: 1 - observed.size / (N_STATES * N_STATES),
    row_counts: last === null ? new Array(N_STATES).fill(0) : rowCounts(seq, last, N_STATES),
    next_distribution: dist.map((x) => round(x)),
    digit_next_distribution: digit.map((x) => round(x)),
    top_next: top(dist),
    top_next_digit: top(digit),
  };
}
