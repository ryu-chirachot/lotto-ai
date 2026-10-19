"use client";

import type { ModelParams } from "@/lib/types";

import { Field, NumberInput } from "./ui";
import WeightSliders from "./WeightSliders";

/** Weight sliders plus the shared model hyper-parameters. */
export default function ModelControls({ params, onChange }: { params: ModelParams; onChange: (p: ModelParams) => void }) {
  return (
    <div className="space-y-5">
      <WeightSliders weights={params.weights} onChange={(weights) => onChange({ ...params, weights })} />
      <div className="grid grid-cols-2 gap-3 border-t border-line pt-4">
        <Field label="Half-life" hint="งวด">
          <NumberInput
            min={1}
            max={500}
            value={params.half_life}
            onChange={(e) => onChange({ ...params, half_life: Math.max(1, Number(e.target.value) || 1) })}
          />
        </Field>
        <Field label="Markov α" hint="smoothing">
          <NumberInput
            min={0.01}
            step={0.05}
            value={params.markov_alpha}
            onChange={(e) => onChange({ ...params, markov_alpha: Math.max(0.01, Number(e.target.value) || 0.01) })}
          />
        </Field>
        <Field label="ใช้ข้อมูลย้อนหลัง" hint="งวด (0 = ทั้งหมด)">
          <NumberInput
            min={0}
            value={params.window ?? 0}
            onChange={(e) => {
              const v = Number(e.target.value) || 0;
              onChange({ ...params, window: v >= 10 ? v : null });
            }}
          />
        </Field>
      </div>
    </div>
  );
}
