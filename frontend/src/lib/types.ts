// Shapes shared by the FastAPI backend and the in-browser engines.

export type Lottery = "thai" | "lao";

export interface Draw {
  date: string;
  last2: string;
  first_prize?: string | null;
}

export interface Dataset {
  lottery: Lottery;
  source: string;
  synthetic: boolean;
  updated_at: string | null;
  draws: Draw[];
}

export interface ChiSquare {
  statistic: number;
  p_value: number;
  dof: number;
}

export interface CountRow {
  number: number;
  count: number;
  z: number;
}

export interface Summary2D {
  n_draws: number;
  counts: number[];
  probabilities: number[];
  gaps: number[];
  hot_cold: { window: number; expected: number; hot: CountRow[]; cold: CountRow[] };
  chi_square: ChiSquare;
  tens_counts: number[];
  units_counts: number[];
}

export interface Summary6D {
  n_draws: number;
  positional_counts: number[][];
  positional_chi_square: ChiSquare[];
  digit_sum_hist: number[];
  digit_sum_mean: number;
}

export interface StatsResponse {
  last2: Summary2D;
  first_prize: Summary6D | null;
}

export interface MarkovResponse {
  current_state: number | null;
  n_transitions: number;
  observed_cells: number;
  sparsity: number;
  row_counts: number[];
  next_distribution: number[];
  digit_next_distribution: number[];
  top_next: { number: number; p: number }[];
  top_next_digit: { number: number; p: number }[];
}

export type ComponentName = "frequency" | "recency" | "markov" | "digit_markov" | "gap" | "uniform";
export type Weights = Record<ComponentName, number>;

export interface ModelParams {
  weights: Weights;
  half_life: number;
  markov_alpha: number;
  window: number | null;
}

export interface BlendRequest extends ModelParams {
  lottery: Lottery;
  top_k: number;
}

export interface BlendResponse {
  scores: number[];
  top: { number: number; score: number; lift: number }[];
  components: Record<ComponentName, number[]>;
}

export interface BacktestRequest extends ModelParams {
  lottery: Lottery;
  top_k: number;
  min_history: number;
  stake: number;
  payout: number;
}

export interface BacktestPoint {
  index: number;
  date: string | null;
  actual: number;
  hit: boolean;
  cum_hits: number;
  cum_expected: number;
  cum_roi: number;
}

export interface BacktestResponse {
  n_tests: number;
  hits: number;
  hit_rate: number;
  baseline_rate: number;
  p_value: number;
  total_cost: number;
  total_return: number;
  roi: number;
  series: BacktestPoint[];
}

export interface MonteCarloRequest {
  n_sims: number;
  alpha: number;
  uniform_mix: number;
  window: number | null;
  top_k: number;
  seed: number | null;
  sum_min: number;
  sum_max: number;
  max_repeat: number;
  even_min: number;
  even_max: number;
  fixed: Record<number, number>;
  exclude_digits: number[];
}

export interface MonteCarloResponse {
  n_sims: number;
  accepted: number;
  acceptance_rate: number;
  unique: number;
  positional_probabilities: number[][];
  candidates: { number: string; hits: number; likelihood: number; lift: number }[];
  digit_sum_hist: number[];
}

export const COMPONENTS: ComponentName[] = ["frequency", "recency", "markov", "digit_markov", "gap", "uniform"];

export const DEFAULT_WEIGHTS: Weights = {
  frequency: 1,
  recency: 1,
  markov: 0.5,
  digit_markov: 0.5,
  gap: 0.5,
  uniform: 1,
};
