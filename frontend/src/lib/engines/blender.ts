// Port of backend/app/engines/blender.py.

import { COMPONENTS, type BlendResponse, type ComponentName, type Weights } from "../types";
import { digitMarkovDistribution, nextDistribution } from "./markov";
import { normalize, round } from "./mathutil";
import { frequency, gaps, N_STATES, recencyWeighted, smoothedProbabilities } from "./stats";

export interface BlendOptions {
  halfLife?: number;
  markovAlpha?: number;
  window?: number | null;
}

export function componentScores(seq: number[], opts: BlendOptions = {}): Record<ComponentName, number[]> {
  const recent = opts.window ? seq.slice(-opts.window) : seq;
  return {
    frequency: smoothedProbabilities(frequency(recent)),
    recency: recencyWeighted(recent, opts.halfLife ?? 20),
    markov: nextDistribution(recent, opts.markovAlpha ?? 0.1),
    digit_markov: digitMarkovDistribution(recent),
    gap: normalize(gaps(recent).map((g) => g + 1)),
    uniform: new Array(N_STATES).fill(1 / N_STATES),
  };
}

export function blend(seq: number[], weights: Partial<Weights>, opts: BlendOptions = {}): number[] {
  const active = COMPONENTS.map((k) => [k, Math.max(0, weights[k] ?? 0)] as const).filter(([, w]) => w > 0);
  const total = active.reduce((a, [, w]) => a + w, 0);
  if (total <= 0) return new Array(N_STATES).fill(1 / N_STATES);
  const scores = componentScores(seq, opts);
  const out = new Array(N_STATES).fill(0);
  for (const [k, w] of active) for (let i = 0; i < N_STATES; i++) out[i] += w * scores[k][i];
  return out.map((x) => x / total);
}

export function rank(scores: number[], topK = 10): number[] {
  return [...scores.keys()].sort((a, b) => scores[b] - scores[a] || a - b).slice(0, topK);
}

export function blendReport(seq: number[], weights: Partial<Weights>, topK: number, opts: BlendOptions = {}): BlendResponse {
  const scores = blend(seq, weights, opts);
  const comps = componentScores(seq, opts);
  return {
    scores: scores.map((x) => round(x)),
    top: rank(scores, topK).map((i) => ({ number: i, score: round(scores[i]), lift: round(scores[i] * N_STATES, 4) })),
    components: Object.fromEntries(
      Object.entries(comps).map(([k, v]) => [k, v.map((x) => round(x))]),
    ) as Record<ComponentName, number[]>,
  };
}
