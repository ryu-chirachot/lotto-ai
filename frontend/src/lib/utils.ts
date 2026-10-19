import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const pad2 = (n: number) => String(n).padStart(2, "0");

export const pct = (x: number, digits = 1) => `${(x * 100).toFixed(digits)}%`;

export const fmtNum = (x: number, digits = 0) =>
  x.toLocaleString("th-TH", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export function fmtP(p: number): string {
  if (p < 0.0001) return "< 0.0001";
  return p.toFixed(4);
}

const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

export function thaiDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${TH_MONTHS[m - 1]} ${String(y + 543).slice(-2)}`;
}

/** Linear interpolation across a list of hex stops, t in [0, 1]. */
export function rampColor(stops: string[], t: number): string {
  const x = Math.min(1, Math.max(0, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  const f = x - i;
  const a = hexToRgb(stops[i]);
  const b = hexToRgb(stops[i + 1]);
  const mix = a.map((v, k) => Math.round(v + (b[k] - v) * f));
  return `rgb(${mix[0]} ${mix[1]} ${mix[2]})`;
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Relative luminance check so cell text stays readable on any ramp step. */
export function isDark(rgb: string): boolean {
  const [r, g, b] = rgb.match(/\d+/g)!.map(Number).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.25;
}
