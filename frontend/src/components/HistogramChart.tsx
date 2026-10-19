"use client";

import { baseAxis, baseTooltip, useChartTheme } from "@/lib/useChartTheme";

import EChart from "./EChart";

/** Single-series bar histogram (e.g. digit sums, tens/units counts). */
export default function HistogramChart({
  values,
  labels,
  label,
  unit = "ครั้ง",
  height = 200,
  reference,
}: {
  values: number[];
  labels: string[];
  label: string;
  unit?: string;
  height?: number;
  reference?: number;
}) {
  const t = useChartTheme();
  return (
    <EChart
      label={label}
      height={height}
      option={{
        animation: false,
        grid: { left: 36, right: 8, top: 12, bottom: 24 },
        tooltip: {
          ...baseTooltip(t),
          trigger: "axis",
          axisPointer: { type: "shadow", shadowStyle: { color: t.dark ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.04)" } },
          valueFormatter: (v: unknown) => `${v} ${unit}`,
        },
        xAxis: { type: "category", data: labels, ...baseAxis(t), splitLine: { show: false }, axisLabel: { ...baseAxis(t).axisLabel, hideOverlap: true } },
        yAxis: { type: "value", ...baseAxis(t), splitNumber: 4 },
        series: [
          {
            type: "bar",
            data: values,
            barCategoryGap: "15%",
            itemStyle: { color: t.series1, borderRadius: [4, 4, 0, 0] },
            markLine:
              reference === undefined
                ? undefined
                : {
                    silent: true,
                    symbol: "none",
                    label: { show: false },
                    lineStyle: { color: t.reference, type: "dashed", width: 1 },
                    data: [{ yAxis: reference }],
                  },
          },
        ],
      }}
    />
  );
}
