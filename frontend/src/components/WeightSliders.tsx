"use client";

import { COMPONENTS, type ComponentName, type Weights } from "@/lib/types";
import { pct } from "@/lib/utils";

export const COMPONENT_INFO: Record<ComponentName, { label: string; hint: string }> = {
  frequency: { label: "ความถี่ระยะยาว", hint: "เลขที่ออกบ่อยในช่วงข้อมูล" },
  recency: { label: "ความถี่ล่าสุด", hint: "ถ่วงน้ำหนักงวดใหม่ (half-life)" },
  markov: { label: "Markov 100×100", hint: "เลขที่เคยตามหลังเลขงวดล่าสุด" },
  digit_markov: { label: "Markov รายหลัก", hint: "หลักสิบ/หน่วยแยกกัน 10×10" },
  gap: { label: "เลขค้าง (Gap)", hint: "เลขที่ไม่ออกมานาน" },
  uniform: { label: "สุ่มล้วน", hint: "ทุกเลข 1% (ค่าอ้างอิง)" },
};

export default function WeightSliders({ weights, onChange }: { weights: Weights; onChange: (w: Weights) => void }) {
  const total = COMPONENTS.reduce((a, k) => a + weights[k], 0);
  return (
    <div className="space-y-4">
      {COMPONENTS.map((k) => (
        <div key={k}>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <label htmlFor={`w-${k}`} className="font-medium">
              {COMPONENT_INFO[k].label}
            </label>
            <span className="text-xs text-ink-2 tnum">
              {weights[k].toFixed(1)} · {total > 0 ? pct(weights[k] / total, 0) : "0%"}
            </span>
          </div>
          <input
            id={`w-${k}`}
            type="range"
            min={0}
            max={3}
            step={0.1}
            value={weights[k]}
            onChange={(e) => onChange({ ...weights, [k]: Number(e.target.value) })}
            className="mt-1 w-full"
            aria-describedby={`w-${k}-hint`}
          />
          <p id={`w-${k}-hint`} className="text-xs text-ink-muted">
            {COMPONENT_INFO[k].hint}
          </p>
        </div>
      ))}
    </div>
  );
}
