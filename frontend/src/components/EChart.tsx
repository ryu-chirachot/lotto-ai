"use client";

import type { EChartsOption } from "echarts";
import dynamic from "next/dynamic";

// ECharts is the largest dependency; load it after first paint, client-only.
const EChartImpl = dynamic(() => import("./EChartImpl"), {
  ssr: false,
  loading: () => <div className="animate-pulse rounded-lg bg-raised/60" style={{ height: "100%" }} />,
});

export default function EChart({ option, height = 260, label }: { option: EChartsOption; height?: number; label: string }) {
  return (
    <div style={{ height }}>
      <EChartImpl option={option} height={height} label={label} />
    </div>
  );
}
