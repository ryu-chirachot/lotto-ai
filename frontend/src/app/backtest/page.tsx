"use client";

import { Play, RotateCcw } from "lucide-react";
import { useState } from "react";

import BacktestChart from "@/components/BacktestChart";
import LotteryPicker, { useLottery } from "@/components/LotteryPicker";
import ModelControls from "@/components/ModelControls";
import { Button, Card, CardHeader, ErrorNote, Field, NumberInput, Stat } from "@/components/ui";
import { runBacktest } from "@/lib/api";
import { DEFAULT_WEIGHTS, type BacktestResponse, type ModelParams } from "@/lib/types";
import { cn, fmtNum, fmtP, pad2, pct, thaiDate } from "@/lib/utils";

const DEFAULT_PARAMS: ModelParams = { weights: DEFAULT_WEIGHTS, half_life: 20, markov_alpha: 0.1, window: null };

export default function BacktestPage() {
  const [lottery, setLottery] = useLottery();
  const [params, setParams] = useState<ModelParams>(DEFAULT_PARAMS);
  const [topK, setTopK] = useState(10);
  const [minHistory, setMinHistory] = useState(50);
  const [stake, setStake] = useState(80);
  const [payout, setPayout] = useState(2000);
  const [result, setResult] = useState<BacktestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    setError(null);
    // let the button state paint before the synchronous in-browser loop starts
    await new Promise((r) => setTimeout(r, 30));
    try {
      setResult(await runBacktest({ lottery, top_k: topK, min_history: minHistory, stake, payout, ...params }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  const significant = result && result.p_value < 0.05;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Strategy Backtest</h1>
          <p className="mt-1 text-sm text-ink-2">
            ทดสอบย้อนหลังแบบ walk-forward: ทุกงวดโมเดลเห็นเฉพาะข้อมูลก่อนหน้า เลือก Top-K แล้วเทียบกับผลจริง
          </p>
        </div>
        <LotteryPicker
          value={lottery}
          onChange={(l) => {
            setLottery(l);
            setResult(null);
          }}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader
            title="ตั้งค่ากลยุทธ์"
            action={
              <Button variant="ghost" className="px-2 py-1" onClick={() => setParams(DEFAULT_PARAMS)} aria-label="รีเซ็ตค่า">
                <RotateCcw size={14} aria-hidden />
              </Button>
            }
          />
          <div className="mb-5 grid grid-cols-2 gap-3">
            <Field label="ซื้อ Top-K" hint="เลข/งวด">
              <NumberInput min={1} max={100} value={topK} onChange={(e) => setTopK(Math.min(100, Math.max(1, Number(e.target.value) || 1)))} />
            </Field>
            <Field label="ข้อมูลเริ่มต้น" hint="งวด">
              <NumberInput min={5} value={minHistory} onChange={(e) => setMinHistory(Math.max(5, Number(e.target.value) || 5))} />
            </Field>
            <Field label="ต้นทุน/เลข" hint="บาท">
              <NumberInput min={1} value={stake} onChange={(e) => setStake(Math.max(1, Number(e.target.value) || 1))} />
            </Field>
            <Field label="เงินรางวัล" hint="บาท">
              <NumberInput min={0} value={payout} onChange={(e) => setPayout(Math.max(0, Number(e.target.value) || 0))} />
            </Field>
          </div>
          <p className="mb-5 text-xs text-ink-muted">ค่าเริ่มต้น: สลาก 80 บาท ถูกเลขท้าย 2 ตัวได้ 2,000 บาท (อัตราทางการของ สกส.)</p>
          <ModelControls params={params} onChange={setParams} />
          <Button onClick={run} disabled={running} className="mt-5 w-full">
            <Play size={16} aria-hidden />
            {running ? "กำลังทดสอบ…" : "รัน Backtest"}
          </Button>
        </Card>

        <div className="min-w-0 space-y-6">
          {error && <ErrorNote error={error} />}
          {!result && !error && (
            <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-dashed border-line p-6 text-center text-sm text-ink-muted">
              ตั้งค่ากลยุทธ์แล้วกด “รัน Backtest”
            </div>
          )}
          {result && (
            <>
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <Stat
                  label="Hit rate"
                  value={pct(result.hit_rate)}
                  hint={`${result.hits}/${result.n_tests} งวด · สุ่ม ${pct(result.baseline_rate)}`}
                />
                <Stat
                  label="p-value (binomial)"
                  value={<span className="tnum">{fmtP(result.p_value)}</span>}
                  hint={significant ? "ดีกว่าสุ่มอย่างมีนัยสำคัญ (ระวัง overfit)" : "ไม่ต่างจากการสุ่ม"}
                />
                <Stat label="ROI รวม" value={pct(result.roi)} tone={result.roi >= 0 ? "good" : "bad"} hint={`ถ้าสุ่ม คาดหวัง ${pct(payout / (stake * 100) - 1)}`} />
                <Stat label="กำไร/ขาดทุน" value={`${fmtNum(result.total_return - result.total_cost)} ฿`} hint={`ลงทุน ${fmtNum(result.total_cost)} ฿`} />
              </div>
              <Card>
                <CardHeader title="ผลสะสม" subtitle="เส้นประ = จำนวนครั้งที่คาดว่าจะถูกถ้าเลือกเลขแบบสุ่ม" />
                <BacktestChart series={result.series} />
              </Card>
              <Card>
                <CardHeader title="งวดล่าสุด" subtitle="ผลจริงของ 30 งวดสุดท้ายในการทดสอบ" />
                <ul className="flex flex-wrap gap-1.5">
                  {result.series.slice(-30).map((p) => (
                    <li
                      key={p.index}
                      title={p.date ? thaiDate(p.date) : undefined}
                      className={cn(
                        "flex w-14 flex-col items-center rounded-md border py-1 text-sm",
                        p.hit ? "border-good/50 bg-good/10" : "border-line",
                      )}
                    >
                      <span className="font-semibold tnum">{pad2(p.actual)}</span>
                      <span className={cn("text-[10px]", p.hit ? "text-good" : "text-ink-muted")}>{p.hit ? "✓ ถูก" : "✕"}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
