// Typed API client with two transports:
//  - NEXT_PUBLIC_API_URL set   -> calls the FastAPI backend
//  - unset (GitHub Pages build) -> loads static JSON and runs the engines in the browser

import { backtest } from "./engines/backtester";
import { blendReport } from "./engines/blender";
import { markovSummary } from "./engines/markov";
import { simulate } from "./engines/montecarlo";
import { summary2D, summary6D } from "./engines/stats";
import type {
  BacktestRequest,
  BacktestResponse,
  BlendRequest,
  BlendResponse,
  Dataset,
  Lottery,
  MarkovResponse,
  MonteCarloRequest,
  MonteCarloResponse,
  StatsResponse,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const transport: "api" | "static" = API_URL ? "api" : "static";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

const post = <T>(path: string, body: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) });

const datasetCache = new Map<Lottery, Promise<Dataset>>();

export function getDataset(lottery: Lottery): Promise<Dataset> {
  let cached = datasetCache.get(lottery);
  if (!cached) {
    cached =
      transport === "api"
        ? request<Dataset>(`/api/draws/${lottery}`)
        : fetch(`${BASE_PATH}/data/${lottery}.json`).then((r) => {
            if (!r.ok) throw new Error(`โหลดข้อมูล ${lottery} ไม่สำเร็จ (${r.status})`);
            return r.json() as Promise<Dataset>;
          });
    cached.catch(() => datasetCache.delete(lottery));
    datasetCache.set(lottery, cached);
  }
  return cached;
}

const last2Of = (d: Dataset) => d.draws.map((x) => Number(x.last2));
const firstPrizesOf = (d: Dataset) => d.draws.map((x) => x.first_prize).filter((x): x is string => !!x);

const qs = (params: Record<string, string | number | null | undefined>) => {
  const entries = Object.entries(params).filter(([, v]) => v !== null && v !== undefined) as [string, string][];
  return entries.length ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)]))}` : "";
};

export async function getStats(lottery: Lottery, window: number | null, topK = 10): Promise<StatsResponse> {
  if (transport === "api") return request(`/api/stats/${lottery}${qs({ window, top_k: topK })}`);
  const d = await getDataset(lottery);
  const firsts = firstPrizesOf(d);
  return {
    last2: summary2D(last2Of(d), window, topK),
    first_prize: firsts.length ? summary6D(firsts, window) : null,
  };
}

export async function getMarkov(lottery: Lottery, alpha: number, window: number | null): Promise<MarkovResponse> {
  if (transport === "api") return request(`/api/markov/${lottery}${qs({ alpha, window })}`);
  const seq = last2Of(await getDataset(lottery));
  return markovSummary(window ? seq.slice(-window) : seq, alpha);
}

export async function getBlend(req: BlendRequest): Promise<BlendResponse> {
  if (transport === "api") return post("/api/blend", req);
  const seq = last2Of(await getDataset(req.lottery));
  return blendReport(seq, req.weights, req.top_k, {
    halfLife: req.half_life,
    markovAlpha: req.markov_alpha,
    window: req.window,
  });
}

export async function runBacktest(req: BacktestRequest): Promise<BacktestResponse> {
  if (transport === "api") return post("/api/backtest", req);
  const d = await getDataset(req.lottery);
  return backtest(last2Of(d), req.weights, {
    topK: req.top_k,
    minHistory: req.min_history,
    stake: req.stake,
    payout: req.payout,
    halfLife: req.half_life,
    markovAlpha: req.markov_alpha,
    window: req.window,
    dates: d.draws.map((x) => x.date),
  });
}

export async function runMonteCarlo(req: MonteCarloRequest): Promise<MonteCarloResponse> {
  if (transport === "api") return post("/api/montecarlo", req);
  const firsts = firstPrizesOf(await getDataset("thai"));
  return simulate(req.window ? firsts.slice(-req.window) : firsts, req);
}
