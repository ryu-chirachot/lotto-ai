// Port of backend/app/engines/montecarlo_6d.py. Seeds use mulberry32, so a
// seeded browser run repeats itself but does not match NumPy's stream.

import type { MonteCarloRequest, MonteCarloResponse } from "../types";
import { mulberry32, round } from "./mathutil";
import { positionalFrequency } from "./stats";

export function positionalProbabilities(firstPrizes: string[], req: MonteCarloRequest): number[][] {
  const counts = positionalFrequency(firstPrizes);
  return counts.map((row, pos) => {
    const total = row.reduce((a, c) => a + c + req.alpha, 0);
    let probs = row.map((c) => (1 - req.uniform_mix) * ((c + req.alpha) / total) + req.uniform_mix / 10);
    for (const d of req.exclude_digits) probs[d] = 0;
    const fixed = req.fixed[pos];
    if (fixed !== undefined && fixed !== null) probs = probs.map((_, d) => (d === fixed ? 1 : 0));
    const s = probs.reduce((a, b) => a + b, 0);
    if (s === 0) throw new Error(`ตำแหน่งที่ ${pos + 1} ไม่มีเลขที่อนุญาตเหลืออยู่`);
    return probs.map((p) => p / s);
  });
}

function accepts(digits: number[], req: MonteCarloRequest): boolean {
  let s = 0;
  let evens = 0;
  const seen = new Array(10).fill(0);
  for (const d of digits) {
    s += d;
    if (d % 2 === 0) evens += 1;
    seen[d] += 1;
  }
  return (
    s >= req.sum_min &&
    s <= req.sum_max &&
    evens >= req.even_min &&
    evens <= req.even_max &&
    Math.max(...seen) <= req.max_repeat
  );
}

export function simulate(firstPrizes: string[], req: MonteCarloRequest): MonteCarloResponse {
  const probs = positionalProbabilities(firstPrizes, req);
  const cdf = probs.map((row) => {
    let acc = 0;
    return row.map((p) => (acc += p));
  });
  const rand = req.seed === null ? Math.random : mulberry32(req.seed);
  const freq = new Map<string, number>();
  const hist = new Array(55).fill(0);
  let accepted = 0;
  for (let i = 0; i < req.n_sims; i++) {
    const digits: number[] = [];
    for (let p = 0; p < 6; p++) {
      const u = rand();
      let d = cdf[p].findIndex((c) => c > u);
      if (d < 0) d = 9;
      digits.push(d);
    }
    if (!accepts(digits, req)) continue;
    accepted += 1;
    hist[digits.reduce((a, b) => a + b, 0)] += 1;
    const key = digits.join("");
    freq.set(key, (freq.get(key) ?? 0) + 1);
  }
  const logP = probs.map((row) => row.map((p) => Math.log(p + 1e-300)));
  const loglik = (s: string) => [...s].reduce((a, ch, p) => a + logP[p][Number(ch)], 0);
  const ranked = [...freq.keys()]
    .map((s) => ({ s, ll: loglik(s) }))
    .sort((a, b) => b.ll - a.ll || (a.s < b.s ? -1 : 1))
    .slice(0, req.top_k);
  return {
    n_sims: req.n_sims,
    accepted,
    acceptance_rate: req.n_sims ? accepted / req.n_sims : 0,
    unique: freq.size,
    positional_probabilities: probs.map((row) => row.map((p) => round(p))),
    candidates: ranked.map(({ s, ll }) => ({
      number: s,
      hits: freq.get(s) ?? 0,
      likelihood: Math.exp(ll),
      lift: Math.exp(ll) * 1e6,
    })),
    digit_sum_hist: hist,
  };
}
