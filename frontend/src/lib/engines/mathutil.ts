// Small numeric helpers so the browser engines match SciPy's results.

const LANCZOS = [
  676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905,
  -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];

export function lgamma(x: number): number {
  if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
  x -= 1;
  let a = 0.99999999999980993;
  const t = x + 7.5;
  for (let i = 0; i < LANCZOS.length; i++) a += LANCZOS[i] / (x + i + 1);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

/** Regularized upper incomplete gamma Q(a, x). */
export function gammaQ(a: number, x: number): number {
  if (x <= 0) return 1;
  if (x < a + 1) {
    // series for P, then Q = 1 - P
    let sum = 1 / a;
    let term = sum;
    for (let n = 1; n < 1000; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-15) break;
    }
    return 1 - sum * Math.exp(-x + a * Math.log(x) - lgamma(a));
  }
  // Lentz continued fraction for Q
  const tiny = 1e-300;
  let b = x + 1 - a;
  let c = 1 / tiny;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 1000; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  return Math.exp(-x + a * Math.log(x) - lgamma(a)) * h;
}

export function chiSquareSf(stat: number, dof: number): number {
  return gammaQ(dof / 2, stat / 2);
}

/** One-sided binomial test P(X >= k), X ~ Bin(n, p). */
export function binomSf(k: number, n: number, p: number): number {
  if (k <= 0) return 1;
  if (k > n) return 0;
  const lp = Math.log(p);
  const lq = Math.log1p(-p);
  const base = lgamma(n + 1);
  let total = 0;
  for (let i = k; i <= n; i++) {
    total += Math.exp(base - lgamma(i + 1) - lgamma(n - i + 1) + i * lp + (n - i) * lq);
  }
  return Math.min(1, total);
}

/** Deterministic PRNG (mulberry32) so seeded simulations repeat. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const round = (x: number, digits = 6) => {
  const f = 10 ** digits;
  return Math.round(x * f) / f;
};

export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function normalize(xs: number[]): number[] {
  const s = sum(xs);
  return s > 0 ? xs.map((x) => x / s) : xs.map(() => 1 / xs.length);
}
