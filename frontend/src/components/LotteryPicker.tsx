"use client";

import { useEffect, useState } from "react";

import type { Lottery } from "@/lib/types";

import { Segmented } from "./ui";

export const LOTTERY_LABEL: Record<Lottery, string> = { thai: "หวยรัฐบาลไทย", lao: "หวยลาวพัฒนา" };

const KEY = "lotto-ai:lottery";

/** Lottery choice shared across pages via localStorage (best effort). */
export function useLottery(): [Lottery, (l: Lottery) => void] {
  const [lottery, setLottery] = useState<Lottery>("thai");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "thai" || saved === "lao") setLottery(saved);
    } catch {}
  }, []);
  const update = (l: Lottery) => {
    setLottery(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {}
  };
  return [lottery, update];
}

export default function LotteryPicker({ value, onChange }: { value: Lottery; onChange: (l: Lottery) => void }) {
  return (
    <Segmented
      label="เลือกประเภทหวย"
      value={value}
      onChange={onChange}
      options={[
        { value: "thai", label: LOTTERY_LABEL.thai },
        { value: "lao", label: LOTTERY_LABEL.lao },
      ]}
    />
  );
}
