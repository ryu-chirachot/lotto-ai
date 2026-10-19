"use client";

import type { BacktestPoint } from "@/lib/types";
import { baseAxis, baseTooltip, useChartTheme } from "@/lib/useChartTheme";
import { thaiDate } from "@/lib/utils";

import EChart from "./EChart";

/** Two stacked charts on separate axes: cumulative hits vs. chance, then cumulative ROI. */
export default function BacktestChart({ series }: { series: BacktestPoint[] }) {
  const t = useChartTheme();
  const x = series.map((p) => (p.date ? thaiDate(p.date) : String(p.index)));
  const common = {
    animation: false,
    grid: { left: 48, right: 16, top: 36, bottom: 28 },
    xAxis: { type: "category" as const, data: x, ...baseAxis(t), splitLine: { show: false }, axisLabel: { ...baseAxis(t).axisLabel, hideOverlap: true } },
  };
  return (
    <div className="space-y-6">
      <EChart
        label="จำนวนครั้งที่ถูกสะสม เทียบกับค่าคาดหวังจากการสุ่ม"
        height={280}
        option={{
          ...common,
          legend: { top: 0, left: 0, icon: "roundRect", itemWidth: 14, itemHeight: 4, itemGap: 20, textStyle: { color: t.ink2, padding: [0, 0, 0, 4] } },
          tooltip: { ...baseTooltip(t), trigger: "axis", axisPointer: { type: "line", lineStyle: { color: t.axis } } },
          yAxis: { type: "value", ...baseAxis(t) },
          series: [
            {
              name: "โมเดล (ถูกสะสม)",
              type: "line",
              data: series.map((p) => p.cum_hits),
              showSymbol: false,
              lineStyle: { width: 2, color: t.series1 },
              itemStyle: { color: t.series1 },
            },
            {
              name: "สุ่มล้วน (คาดหวัง)",
              type: "line",
              data: series.map((p) => p.cum_expected),
              showSymbol: false,
              lineStyle: { width: 2, color: t.reference, type: "dashed" },
              itemStyle: { color: t.reference },
            },
          ],
        }}
      />
      <EChart
        label="ผลตอบแทนสะสม (ROI)"
        height={220}
        option={{
          ...common,
          title: { text: "ROI สะสม", textStyle: { color: t.ink2, fontSize: 12, fontWeight: 500 }, left: 0, top: 0 },
          tooltip: {
            ...baseTooltip(t),
            trigger: "axis",
            valueFormatter: (v: unknown) => `${((v as number) * 100).toFixed(1)}%`,
          },
          yAxis: {
            type: "value",
            ...baseAxis(t),
            axisLabel: { ...baseAxis(t).axisLabel, formatter: (v: number) => `${Math.round(v * 100)}%` },
          },
          series: [
            {
              name: "ROI",
              type: "line",
              data: series.map((p) => p.cum_roi),
              showSymbol: false,
              lineStyle: { width: 2, color: t.series1 },
              itemStyle: { color: t.series1 },
              markLine: {
                silent: true,
                symbol: "none",
                label: { show: false },
                lineStyle: { color: t.axis, width: 1 },
                data: [{ yAxis: 0 }],
              },
            },
          ],
        }}
      />
    </div>
  );
}
