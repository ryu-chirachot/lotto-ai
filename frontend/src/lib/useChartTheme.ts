"use client";

import { useEffect, useState } from "react";

// Chart colours from the reference data-viz palette, stepped per mode.
const LIGHT = {
  dark: false,
  surface: "#fcfcfb",
  ink: "#0b0b0b",
  ink2: "#52514e",
  muted: "#898781",
  grid: "#e1e0d9",
  axis: "#c3c2b7",
  series1: "#2a78d6",
  series2: "#eb6834",
  good: "#0ca30c",
  bad: "#d03b3b",
  reference: "#898781",
  sequential: ["#eef4fc", "#b7d3f6", "#6da7ec", "#2a78d6", "#1c5cab", "#0d366b"],
};

const DARK: typeof LIGHT = {
  dark: true,
  surface: "#1a1a19",
  ink: "#f0efec",
  ink2: "#c3c2b7",
  muted: "#898781",
  grid: "#2c2c2a",
  axis: "#383835",
  series1: "#3987e5",
  series2: "#d95926",
  good: "#0ca30c",
  bad: "#e66767",
  reference: "#898781",
  sequential: ["#1f2530", "#104281", "#1c5cab", "#3987e5", "#86b6ef", "#cde2fb"],
};

export type ChartTheme = typeof LIGHT;

export function useChartTheme(): ChartTheme {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const read = () => {
      const forced = document.documentElement.dataset.theme;
      setDark(forced ? forced === "dark" : mq.matches);
    };
    read();
    mq.addEventListener("change", read);
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      mq.removeEventListener("change", read);
      obs.disconnect();
    };
  }, []);
  return dark ? DARK : LIGHT;
}

export function baseAxis(t: ChartTheme) {
  return {
    axisLine: { lineStyle: { color: t.axis } },
    axisTick: { show: false },
    axisLabel: { color: t.muted, fontSize: 11 },
    splitLine: { lineStyle: { color: t.grid, width: 1 } },
  };
}

export function baseTooltip(t: ChartTheme) {
  return {
    backgroundColor: t.surface,
    borderColor: t.grid,
    borderWidth: 1,
    textStyle: { color: t.ink, fontSize: 12 },
    extraCssText: "box-shadow: 0 4px 16px rgba(0,0,0,.12); border-radius: 8px;",
  };
}
