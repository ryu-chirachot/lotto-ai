// Port of backend/app/engines/stats_engine.py. Draws are oldest-first.

import type { ChiSquare, CountRow, Summary2D, Summary6D } from "../types";
import { chiSquareSf, normalize, round, sum } from "./mathutil";

export const N_STATES = 100;

export function frequency(numbers: number[], nStates = N_STATES): number[] {
  const counts = new Array(nStates).fill(0);
  for (const n of numbers) counts[n] += 1;
  return counts;
}

export function smoothedProbabilities(counts: number[], alpha = 1): number[] {
  return normalize(counts.map((c) => c + alpha));
}

export function recencyWeighted(numbers: number[], halfLife = 20, nStates = N_STATES): number[] {
  if (numbers.length === 0) return new Array(nStates).fill(1 / nStates);
  const decay = 0.5 ** (1 / Math.max(halfLife, 1e-9));
  const w = new Array(nStates).fill(0);
  const n = numbers.length;
  numbers.forEach((v, i) => {
    w[v] += decay ** (n - 1 - i);
  });
  return normalize(w.map((x) => x + 1e-3));
}

export function gaps(numbers: number[], nStates = N_STATES): number[] {
  const n = numbers.length;
  const out = new Array(nStates).fill(n);
  numbers.forEach((v, i) => {
    out[v] = n - 1 - i;
  });
  return out;
}

export function chiSquareUniformity(counts: number[]): ChiSquare {
  const total = sum(counts);
  const dof = counts.length - 1;
  if (total === 0) return { statistic: 0, p_value: 1, dof };
  const expected = total / counts.length;
  const statistic = counts.reduce((acc, c) => acc + (c - expected) ** 2 / expected, 0);
  return { statistic, p_value: chiSquareSf(statistic, dof), dof };
}

export function hotCold(numbers: number[], topK = 10) {
  const counts = frequency(numbers);
  const n = numbers.length;
  const p = 1 / N_STATES;
  const expected = n * p;
  const sd = Math.sqrt(n * p * (1 - p)) || 1;
  const idx = [...Array(N_STATES).keys()];
  const row = (i: number): CountRow => ({ number: i, count: counts[i], z: round((counts[i] - expected) / sd, 3) });
  const hot = [...idx].sort((a, b) => counts[b] - counts[a] || a - b);
  const cold = [...idx].sort((a, b) => counts[a] - counts[b] || a - b);
  return { window: n, expected, hot: hot.slice(0, topK).map(row), cold: cold.slice(0, topK).map(row) };
}

export function positionalFrequency(sixDigit: string[]): number[][] {
  const counts = Array.from({ length: 6 }, () => new Array(10).fill(0));
  for (const s of sixDigit) for (let p = 0; p < 6; p++) counts[p][Number(s[p])] += 1;
  return counts;
}

export function summary2D(numbers: number[], window: number | null, topK = 10): Summary2D {
  const recent = window ? numbers.slice(-window) : numbers;
  const counts = frequency(recent);
  const tens = new Array(10).fill(0);
  const units = new Array(10).fill(0);
  for (const n of recent) {
    tens[Math.floor(n / 10)] += 1;
    units[n % 10] += 1;
  }
  return {
    n_draws: recent.length,
    counts,
    probabilities: smoothedProbabilities(counts).map((x) => round(x)),
    gaps: gaps(recent),
    hot_cold: hotCold(recent, topK),
    chi_square: chiSquareUniformity(counts),
    tens_counts: tens,
    units_counts: units,
  };
}

export function summary6D(sixDigit: string[], window: number | null): Summary6D {
  const recent = window ? sixDigit.slice(-window) : sixDigit;
  const counts = positionalFrequency(recent);
  const hist = new Array(55).fill(0);
  let total = 0;
  for (const s of recent) {
    const ds = [...s].reduce((a, ch) => a + Number(ch), 0);
    hist[ds] += 1;
    total += ds;
  }
  return {
    n_draws: recent.length,
    positional_counts: counts,
    positional_chi_square: counts.map(chiSquareUniformity),
    digit_sum_hist: hist,
    digit_sum_mean: recent.length ? total / recent.length : 0,
  };
}
