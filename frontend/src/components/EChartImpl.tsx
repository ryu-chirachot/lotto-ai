"use client";

import { BarChart, LineChart } from "echarts/charts";
import { GridComponent, LegendComponent, MarkLineComponent, TitleComponent, TooltipComponent } from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import ReactEChartsCore from "echarts-for-react/lib/core";
import type { EChartsOption } from "echarts";

echarts.use([BarChart, LineChart, GridComponent, LegendComponent, MarkLineComponent, TitleComponent, TooltipComponent, CanvasRenderer]);

// Canvas text ignores CSS, so pass the page font (IBM Plex Sans Thai) explicitly;
// the browser default renders Thai vowel marks overlapping.
const pageFont = () => (typeof document === "undefined" ? "sans-serif" : getComputedStyle(document.body).fontFamily);

export default function EChart({ option, height = 260, label }: { option: EChartsOption; height?: number; label: string }) {
  return (
    <div role="img" aria-label={label}>
      <ReactEChartsCore echarts={echarts} option={{ textStyle: { fontFamily: pageFont() }, ...option }} notMerge style={{ height, width: "100%" }} />
    </div>
  );
}
