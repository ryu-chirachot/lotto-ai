"use client";

import { useMemo, useState } from "react";

import { useChartTheme } from "@/lib/useChartTheme";
import { cn, isDark, pad2, rampColor } from "@/lib/utils";

interface Props {
  /** 100 values indexed by number 00-99. */
  values: number[];
  /** Formats the value shown in the cell and tooltip. */
  format?: (v: number) => string;
  /** Extra tooltip line per number. */
  detail?: (n: number) => string;
  highlight?: number[];
  label: string;
}

/** 10x10 grid: rows are the tens digit, columns the units digit. */
export default function Heatmap2D({ values, format = (v) => String(v), detail, highlight = [], label }: Props) {
  const t = useChartTheme();
  const [hover, setHover] = useState<number | null>(null);
  const { min, max } = useMemo(() => ({ min: Math.min(...values), max: Math.max(...values) }), [values]);
  const scale = (v: number) => (max === min ? 0.5 : (v - min) / (max - min));
  const hl = new Set(highlight);

  return (
    <div>
      <div
        role="grid"
        aria-label={label}
        className="grid gap-[2px]"
        style={{ gridTemplateColumns: "1.5rem repeat(10, minmax(0, 1fr))" }}
        onMouseLeave={() => setHover(null)}
      >
        <div aria-hidden />
        {Array.from({ length: 10 }, (_, c) => (
          <div key={`c${c}`} aria-hidden className="pb-1 text-center text-[10px] text-ink-muted tnum">
            x{c}
          </div>
        ))}
        {values.map((v, n) => {
          const bg = rampColor(t.sequential, scale(v));
          return (
            <div key={n} className="contents">
              {n % 10 === 0 && (
                <div aria-hidden className="flex items-center justify-end pr-1 text-[10px] text-ink-muted tnum">
                  {n / 10}x
                </div>
              )}
              <button
                role="gridcell"
                aria-label={`${pad2(n)}: ${format(v)}`}
                onMouseEnter={() => setHover(n)}
                onFocus={() => setHover(n)}
                className={cn(
                  "relative flex aspect-square flex-col items-center justify-center rounded-[4px] text-[11px] leading-tight tnum sm:text-xs",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
                  hl.has(n) && "ring-2 ring-inset ring-[#eb6834]",
                  hover === n && "outline outline-2 outline-ink",
                )}
                style={{ background: bg, color: isDark(bg) ? "#ffffff" : "#0b0b0b" }}
              >
                <span className="font-semibold">{pad2(n)}</span>
                <span className="hidden opacity-80 sm:block">{format(v)}</span>
              </button>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-2">
        <div className="min-h-[1.25rem]" aria-live="polite">
          {hover !== null ? (
            <span>
              <b className="text-ink">{pad2(hover)}</b> · {format(values[hover])}
              {detail && ` · ${detail(hover)}`}
            </span>
          ) : (
            <span className="text-ink-muted">ชี้ที่ช่องเพื่อดูรายละเอียด</span>
          )}
        </div>
        <div className="flex items-center gap-2" aria-hidden>
          <span className="tnum">{format(min)}</span>
          <span className="h-2 w-28 rounded-full" style={{ background: `linear-gradient(90deg, ${t.sequential.join(",")})` }} />
          <span className="tnum">{format(max)}</span>
        </div>
      </div>
    </div>
  );
}
