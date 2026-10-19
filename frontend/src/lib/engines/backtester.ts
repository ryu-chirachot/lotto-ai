// Port of backend/app/engines/backtester.py (walk-forward, no look-ahead).

import type { BacktestPoint, BacktestResponse, Weights } from "../types";
import { blend, rank, type BlendOptions } from "./blender";
import { binomSf, round } from "./mathutil";
import { N_STATES } from "./stats";

export interface BacktestOptions extends BlendOptions {
  topK?: number;
  minHistory?: number;
  stake?: number;
  payout?: number;
  dates?: string[];
}

export function backtest(seq: number[], weights: Partial<Weights>, opts: BacktestOptions = {}): BacktestResponse {
  const topK = Math.max(1, Math.min(N_STATES, opts.topK ?? 10));
  const minHistory = Math.max(1, opts.minHistory ?? 30);
  const stake = opts.stake ?? 80;
  const payout = opts.payout ?? 2000;
  const series: BacktestPoint[] = [];
  let hits = 0;
  let cost = 0;
  let revenue = 0;
  for (let t = minHistory; t < seq.length; t++) {
    const picks = rank(blend(seq.slice(0, t), weights, opts), topK);
    const hit = picks.includes(seq[t]);
    if (hit) {
      hits += 1;
      revenue += payout;
    }
    cost += stake * topK;
    const n = t - minHistory + 1;
    series.push({
      index: t,
      date: opts.dates?.[t] ?? null,
      actual: seq[t],
      hit,
      cum_hits: hits,
      cum_expected: round((n * topK) / N_STATES, 4),
      cum_roi: round((revenue - cost) / cost),
    });
  }
  const nTests = series.length;
  const baseline = topK / N_STATES;
  return {
    n_tests: nTests,
    hits,
    hit_rate: nTests ? hits / nTests : 0,
    baseline_rate: baseline,
    p_value: nTests ? binomSf(hits, nTests, baseline) : 1,
    total_cost: cost,
    total_return: revenue,
    roi: cost ? (revenue - cost) / cost : 0,
    series,
  };
}
