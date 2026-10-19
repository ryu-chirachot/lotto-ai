"use client";

import type { ChiSquare } from "@/lib/types";
import { baseAxis, baseTooltip, useChartTheme } from "@/lib/useChartTheme";
import { fmtP } from "@/lib/utils";

import EChart from "./EChart";

const POSITION_NAMES = ["แสน", "หมื่น", "พัน", "ร้อย", "สิบ", "หน่วย"];

/** Small multiples: one digit-frequency bar chart per First Prize position. */
export default function PositionalChart({ counts, chi }: { counts: number[][]; chi: ChiSquare[] }) {
  const t = useChartTheme();
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {counts.map((row, pos) => {
        const total = row.reduce((a, b) => a + b, 0);
        const expected = total / 10;
        const maxIdx = row.indexOf(Math.max(...row));
        return (
          <div key={pos} className="rounded-lg border border-line p-3">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">
                หลักที่ {pos + 1} <span className="text-ink-muted">({POSITION_NAMES[pos]})</span>
              </span>
              <span className="text-xs text-ink-2 tnum">p = {fmtP(chi[pos].p_value)}</span>
            </div>
            <EChart
              label={`ความถี่เลข 0-9 ในหลักที่ ${pos + 1}`}
              height={150}
              option={{
                animation: false,
                grid: { left: 28, right: 6, top: 10, bottom: 22 },
                tooltip: {
                  ...baseTooltip(t),
                  trigger: "axis",
                  axisPointer: { type: "shadow", shadowStyle: { color: t.dark ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.04)" } },
                  formatter: (ps: unknown) => {
                    const p = (ps as { dataIndex: number; value: number }[])[0];
                    const dev = ((p.value - expected) / expected) * 100;
                    return `เลข <b>${p.dataIndex}</b><br/>${p.value} ครั้ง (คาดหวัง ${expected.toFixed(1)})<br/>${dev >= 0 ? "+" : ""}${dev.toFixed(0)}%`;
                  },
                },
                xAxis: { type: "category", data: [...Array(10).keys()].map(String), ...baseAxis(t), splitLine: { show: false } },
                yAxis: { type: "value", ...baseAxis(t), splitNumber: 3 },
                series: [
                  {
                    type: "bar",
                    data: row.map((v, d) => ({ value: v, itemStyle: { opacity: d === maxIdx ? 1 : 0.75 } })),
                    barCategoryGap: "20%",
                    itemStyle: { color: t.series1, borderRadius: [4, 4, 0, 0] },
                    markLine: {
                      silent: true,
                      symbol: "none",
                      label: { show: false },
                      lineStyle: { color: t.reference, type: "dashed", width: 1 },
                      data: [{ yAxis: expected }],
                    },
                  },
                ],
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
