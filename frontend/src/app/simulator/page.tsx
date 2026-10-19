"use client";

import { Dices, RotateCcw } from "lucide-react";
import { useDeferredValue, useState } from "react";

import Heatmap2D from "@/components/Heatmap2D";
import HistogramChart from "@/components/HistogramChart";
import LotteryPicker, { useLottery } from "@/components/LotteryPicker";
import ModelControls from "@/components/ModelControls";
import { COMPONENT_INFO } from "@/components/WeightSliders";
import { Button, Card, CardHeader, ErrorNote, Field, Loading, NumberInput } from "@/components/ui";
import { getBlend, runMonteCarlo } from "@/lib/api";
import { COMPONENTS, DEFAULT_WEIGHTS, type ModelParams, type MonteCarloRequest, type MonteCarloResponse } from "@/lib/types";
import { useAsync } from "@/lib/useAsync";
import { cn, fmtNum, pad2, pct } from "@/lib/utils";

const DEFAULT_PARAMS: ModelParams = { weights: DEFAULT_WEIGHTS, half_life: 20, markov_alpha: 0.1, window: null };

export default function SimulatorPage() {
  const [lottery, setLottery] = useLottery();
  const [params, setParams] = useState<ModelParams>(DEFAULT_PARAMS);
  const [topK, setTopK] = useState(10);
  const deferred = useDeferredValue(params);

  const blend = useAsync(() => getBlend({ lottery, top_k: topK, ...deferred }), [lottery, topK, deferred]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">AI Simulator</h1>
          <p className="mt-1 text-sm text-ink-2">ผสมโมเดลด้วยน้ำหนักที่กำหนดเอง แล้วดูว่าคะแนนเบี่ยงจากโอกาส 1% มากแค่ไหน</p>
        </div>
        <LotteryPicker value={lottery} onChange={setLottery} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader
            title="น้ำหนักโมเดล"
            action={
              <Button variant="ghost" className="px-2 py-1" onClick={() => setParams(DEFAULT_PARAMS)} aria-label="รีเซ็ตค่า">
                <RotateCcw size={14} aria-hidden />
              </Button>
            }
          />
          <ModelControls params={params} onChange={setParams} />
        </Card>

        <div className="min-w-0 space-y-6">
          {blend.error && <ErrorNote error={blend.error} />}
          {!blend.data && blend.loading && <Loading />}
          {blend.data && (
            <>
              <Card>
                <CardHeader
                  title={`อันดับเลขท้าย 2 ตัว (Top ${topK})`}
                  subtitle="Lift = คะแนน ÷ 1% · lift 1.20 หมายถึงโมเดลให้น้ำหนักมากกว่าการสุ่ม 20% ไม่ได้แปลว่าโอกาสจริงเพิ่มขึ้น"
                  action={
                    <div className="w-24">
                      <NumberInput aria-label="จำนวนอันดับ" min={1} max={50} value={topK} onChange={(e) => setTopK(Math.min(50, Math.max(1, Number(e.target.value) || 1)))} />
                    </div>
                  }
                />
                <ol className={cn("grid grid-cols-2 gap-2 sm:grid-cols-5", blend.loading && "opacity-60")}>
                  {blend.data.top.map((r, i) => (
                    <li key={r.number} className="rounded-lg border border-line bg-raised p-3">
                      <div className="text-[10px] text-ink-muted">#{i + 1}</div>
                      <div className="text-2xl font-semibold tnum">{pad2(r.number)}</div>
                      <div className="text-xs text-ink-2 tnum">
                        {pct(r.score, 2)} · lift {r.lift.toFixed(2)}
                      </div>
                    </li>
                  ))}
                </ol>
              </Card>
              <Card>
                <CardHeader title="Heatmap คะแนนรวม" subtitle="ความน่าจะเป็นจากโมเดลผสม (ผลรวม = 100%)" />
                <Heatmap2D
                  label="คะแนนรวมของแต่ละเลข"
                  values={blend.data.scores}
                  format={(v) => pct(v, 1)}
                  highlight={blend.data.top.map((r) => r.number)}
                  detail={(n) =>
                    COMPONENTS.filter((k) => deferred.weights[k] > 0)
                      .map((k) => `${COMPONENT_INFO[k].label} ${pct(blend.data!.components[k][n], 2)}`)
                      .join(" · ")
                  }
                />
                <p className="mt-2 text-xs text-ink-muted">กรอบสีส้ม = อยู่ใน Top {topK}</p>
              </Card>
            </>
          )}
        </div>
      </div>

      <MonteCarloSection />
    </div>
  );
}

const DEFAULT_MC: MonteCarloRequest = {
  n_sims: 20000,
  alpha: 1,
  uniform_mix: 0,
  window: null,
  top_k: 20,
  seed: null,
  sum_min: 0,
  sum_max: 54,
  max_repeat: 6,
  even_min: 0,
  even_max: 6,
  fixed: {},
  exclude_digits: [],
};

function MonteCarloSection() {
  const [req, setReq] = useState<MonteCarloRequest>(DEFAULT_MC);
  const [result, setResult] = useState<MonteCarloResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const set = <K extends keyof MonteCarloRequest>(k: K, v: MonteCarloRequest[K]) => setReq((r) => ({ ...r, [k]: v }));
  const num = (v: string, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(Number(v) || 0)));

  async function run() {
    setRunning(true);
    setError(null);
    try {
      setResult(await runMonteCarlo(req));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  const toggleExclude = (d: number) =>
    set("exclude_digits", req.exclude_digits.includes(d) ? req.exclude_digits.filter((x) => x !== d) : [...req.exclude_digits, d]);

  return (
    <Card>
      <CardHeader
        title="Monte Carlo: รางวัลที่ 1 (6 หลัก)"
        subtitle="สุ่มเลขแต่ละหลักจากการกระจายในอดีต (หวยรัฐบาลไทย) กรองด้วยเงื่อนไข แล้วจัดอันดับตาม likelihood ของโมเดล"
      />
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="จำนวนรอบ">
              <NumberInput min={100} max={500000} step={1000} value={req.n_sims} onChange={(e) => set("n_sims", num(e.target.value, 100, 500000))} />
            </Field>
            <Field label="Seed" hint="ว่าง = สุ่ม">
              <NumberInput
                value={req.seed ?? ""}
                onChange={(e) => set("seed", e.target.value === "" ? null : Math.round(Number(e.target.value)))}
              />
            </Field>
            <Field label="ผลรวมต่ำสุด">
              <NumberInput min={0} max={54} value={req.sum_min} onChange={(e) => set("sum_min", num(e.target.value, 0, 54))} />
            </Field>
            <Field label="ผลรวมสูงสุด">
              <NumberInput min={0} max={54} value={req.sum_max} onChange={(e) => set("sum_max", num(e.target.value, 0, 54))} />
            </Field>
            <Field label="เลขคู่ขั้นต่ำ" hint="หลัก">
              <NumberInput min={0} max={6} value={req.even_min} onChange={(e) => set("even_min", num(e.target.value, 0, 6))} />
            </Field>
            <Field label="เลขคู่สูงสุด" hint="หลัก">
              <NumberInput min={0} max={6} value={req.even_max} onChange={(e) => set("even_max", num(e.target.value, 0, 6))} />
            </Field>
            <Field label="เลขซ้ำได้สูงสุด" hint="ครั้ง">
              <NumberInput min={1} max={6} value={req.max_repeat} onChange={(e) => set("max_repeat", num(e.target.value, 1, 6))} />
            </Field>
            <Field label="ผสมสุ่มล้วน" hint="0–1">
              <NumberInput
                min={0}
                max={1}
                step={0.1}
                value={req.uniform_mix}
                onChange={(e) => set("uniform_mix", Math.min(1, Math.max(0, Number(e.target.value) || 0)))}
              />
            </Field>
          </div>
          <div>
            <div className="text-sm font-medium">ตัดเลขออก</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {[...Array(10).keys()].map((d) => (
                <button
                  key={d}
                  aria-pressed={req.exclude_digits.includes(d)}
                  onClick={() => toggleExclude(d)}
                  className={cn(
                    "h-8 w-8 rounded-md border text-sm tnum",
                    req.exclude_digits.includes(d) ? "border-bad bg-bad/15 text-bad line-through" : "border-line hover:bg-raised",
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium">ล็อกเลขรายหลัก</div>
            <div className="mt-1 grid grid-cols-6 gap-1">
              {[...Array(6).keys()].map((p) => (
                <input
                  key={p}
                  aria-label={`ล็อกหลักที่ ${p + 1}`}
                  inputMode="numeric"
                  maxLength={1}
                  placeholder="·"
                  value={req.fixed[p] ?? ""}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(-1);
                    const fixed = { ...req.fixed };
                    if (v === "") delete fixed[p];
                    else fixed[p] = Number(v);
                    set("fixed", fixed);
                  }}
                  className="h-10 rounded-md border border-line bg-page text-center text-lg font-semibold tnum focus:outline focus:outline-2 focus:outline-accent"
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={run} disabled={running || req.sum_min > req.sum_max || req.even_min > req.even_max} className="flex-1">
              <Dices size={16} aria-hidden />
              {running ? "กำลังจำลอง…" : "รันการจำลอง"}
            </Button>
            <Button variant="ghost" onClick={() => setReq(DEFAULT_MC)} aria-label="รีเซ็ตเงื่อนไข">
              <RotateCcw size={14} aria-hidden />
            </Button>
          </div>
        </div>

        <div className="min-w-0 space-y-5">
          {error && <ErrorNote error={error} />}
          {!result && !error && (
            <div className="flex h-full min-h-[200px] items-center justify-center rounded-lg border border-dashed border-line p-6 text-center text-sm text-ink-muted">
              ตั้งเงื่อนไขแล้วกด “รันการจำลอง”
            </div>
          )}
          {result && (
            <>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <MiniStat label="ผ่านเงื่อนไข" value={`${fmtNum(result.accepted)} / ${fmtNum(result.n_sims)}`} />
                <MiniStat label="อัตราผ่าน" value={pct(result.acceptance_rate)} />
                <MiniStat label="เลขไม่ซ้ำ" value={fmtNum(result.unique)} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-ink-muted">
                      <th className="py-2 pr-3 font-medium">#</th>
                      <th className="py-2 pr-3 font-medium">เลข</th>
                      <th className="py-2 pr-3 text-right font-medium">Likelihood</th>
                      <th className="py-2 text-right font-medium">Lift vs 1/1,000,000</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.candidates.map((c, i) => (
                      <tr key={c.number} className="border-b border-line/60 last:border-0">
                        <td className="py-1.5 pr-3 text-ink-muted tnum">{i + 1}</td>
                        <td className="py-1.5 pr-3 font-mono text-base font-semibold tracking-wider">{c.number}</td>
                        <td className="py-1.5 pr-3 text-right text-ink-2 tnum">{c.likelihood.toExponential(2)}</td>
                        <td className="py-1.5 text-right tnum">{c.lift.toFixed(2)}×</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-ink-muted">
                Lift แสดงว่าโมเดลรายหลักชอบเลขนั้นกว่าการสุ่มเท่าไร แต่สลากทุกใบยังมีโอกาสถูกรางวัลที่ 1 เท่ากันคือ 1 ใน 1,000,000
              </p>
              <div>
                <h3 className="text-sm font-medium">ผลรวมตัวเลขของเลขที่ผ่านเงื่อนไข</h3>
                <HistogramChart
                  label="ฮิสโตแกรมผลรวมตัวเลขจากการจำลอง"
                  values={result.digit_sum_hist}
                  labels={[...Array(55).keys()].map(String)}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-raised p-3">
      <div className="text-xs text-ink-muted">{label}</div>
      <div className="mt-0.5 font-semibold tnum">{value}</div>
    </div>
  );
}
