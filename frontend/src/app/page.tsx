"use client";

import { AlertTriangle, Database } from "lucide-react";
import { useState } from "react";

import Heatmap2D from "@/components/Heatmap2D";
import HistogramChart from "@/components/HistogramChart";
import LotteryPicker, { LOTTERY_LABEL, useLottery } from "@/components/LotteryPicker";
import PositionalChart from "@/components/PositionalChart";
import { Badge, Card, CardHeader, ErrorNote, Loading, Segmented, Stat } from "@/components/ui";
import { getDataset, getMarkov, getStats } from "@/lib/api";
import type { CountRow, Dataset } from "@/lib/types";
import { useAsync } from "@/lib/useAsync";
import { fmtP, pad2, pct, thaiDate } from "@/lib/utils";

const WINDOWS = [
  { value: 0, label: "ทั้งหมด" },
  { value: 200, label: "200 งวด" },
  { value: 100, label: "100 งวด" },
  { value: 50, label: "50 งวด" },
];

export default function Dashboard() {
  const [lottery, setLottery] = useLottery();
  const [win, setWin] = useState(0);
  const [markovMode, setMarkovMode] = useState<"digit" | "full">("digit");
  const span = win || null;

  const data = useAsync(async () => {
    const [dataset, stats, markov] = await Promise.all([getDataset(lottery), getStats(lottery, span), getMarkov(lottery, 0.1, span)]);
    return { dataset, stats, markov };
  }, [lottery, span]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">ภาพรวมสถิติ</h1>
          <p className="mt-1 text-sm text-ink-2">ความถี่ ความน่าจะเป็น และการทดสอบความสุ่มของเลขท้าย 2 ตัว</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LotteryPicker value={lottery} onChange={setLottery} />
          <Segmented label="ช่วงข้อมูล" value={win} onChange={setWin} options={WINDOWS} />
        </div>
      </div>

      {data.error && <ErrorNote error={data.error} />}
      {data.loading && !data.data && <Loading label="กำลังโหลดข้อมูล…" />}

      {data.data && (
        <>
          <SourceBanner dataset={data.data.dataset} />
          <Tiles dataset={data.data.dataset} n={data.data.stats.last2.n_draws} p={data.data.stats.last2.chi_square.p_value} />

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader
                title="Heatmap ความถี่ 00–99"
                subtitle={`จำนวนครั้งที่ออกใน ${data.data.stats.last2.n_draws} งวด · คาดหวัง ${data.data.stats.last2.hot_cold.expected.toFixed(1)} ครั้ง/เลข`}
              />
              <Heatmap2D
                label="ความถี่เลขท้าย 2 ตัว"
                values={data.data.stats.last2.counts}
                detail={(n) => `ค้าง ${data.data!.stats.last2.gaps[n]} งวด`}
                highlight={[Number(data.data.dataset.draws.at(-1)?.last2 ?? -1)]}
              />
              <p className="mt-2 text-xs text-ink-muted">กรอบสีส้ม = เลขงวดล่าสุด</p>
            </Card>
            <Card>
              <CardHeader title="เลขร้อน / เย็น / ค้าง" subtitle="z = ส่วนเบี่ยงเบนจากค่าคาดหวัง (|z| < 2 ถือว่าปกติ)" />
              <RankList title="ร้อน (ออกบ่อย)" rows={data.data.stats.last2.hot_cold.hot.slice(0, 5)} />
              <RankList title="เย็น (ออกน้อย)" rows={data.data.stats.last2.hot_cold.cold.slice(0, 5)} />
              <div className="mt-4">
                <h3 className="text-xs font-medium uppercase tracking-wide text-ink-muted">ค้างนานสุด</h3>
                <ul className="mt-2 grid grid-cols-5 gap-1.5">
                  {topGaps(data.data.stats.last2.gaps, 10).map(([n, g]) => (
                    <li key={n} className="rounded-md bg-raised py-1 text-center text-sm">
                      <div className="font-semibold tnum">{pad2(n)}</div>
                      <div className="text-[10px] text-ink-muted tnum">{g >= data.data!.stats.last2.n_draws ? "ไม่เคยออก" : `${g} งวด`}</div>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Markov: งวดถัดไปหลังเลข"
              subtitle={
                <>
                  สถานะปัจจุบัน <b className="text-ink">{pad2(data.data.markov.current_state ?? 0)}</b> · ความน่าจะเป็นของเลขถัดไป
                </>
              }
              action={
                <Segmented
                  label="ชนิดโมเดล Markov"
                  value={markovMode}
                  onChange={setMarkovMode}
                  options={[
                    { value: "digit", label: "รายหลัก 10×10" },
                    { value: "full", label: "เต็ม 100×100" },
                  ]}
                />
              }
            />
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <Heatmap2D
                  label="ความน่าจะเป็นเลขถัดไปจาก Markov"
                  values={markovMode === "digit" ? data.data.markov.digit_next_distribution : data.data.markov.next_distribution}
                  format={(v) => pct(v, 1)}
                />
              </div>
              <div className="space-y-3 text-sm text-ink-2">
                <p>
                  เมทริกซ์ 100×100 มี {data.data.markov.n_transitions} transitions กระจายใน 10,000 ช่อง — มีข้อมูลเพียง{" "}
                  <b className="text-ink">{pct(1 - data.data.markov.sparsity)}</b> ของช่องทั้งหมด จึงต้องพึ่ง smoothing เกือบทั้งหมด
                </p>
                <p>
                  เลขงวดนี้เคยตามด้วยเลขอื่น {data.data.markov.row_counts.reduce((a, b) => a + b, 0)} ครั้ง โมเดลรายหลักแยกหลักสิบ/หน่วย
                  ใช้ข้อมูลน้อยกว่ามาก จึงเสถียรกว่า
                </p>
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-wide text-ink-muted">อันดับสูงสุด</h3>
                  <ol className="mt-2 grid grid-cols-5 gap-1.5">
                    {(markovMode === "digit" ? data.data.markov.top_next_digit : data.data.markov.top_next).slice(0, 10).map((r) => (
                      <li key={r.number} className="rounded-md bg-raised py-1 text-center">
                        <div className="font-semibold text-ink tnum">{pad2(r.number)}</div>
                        <div className="text-[10px] tnum">{pct(r.p, 1)}</div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader title="หลักสิบ" subtitle="ความถี่ของเลขหลักสิบ 0–9" />
              <HistogramChart
                label="ความถี่หลักสิบ"
                values={data.data.stats.last2.tens_counts}
                labels={[...Array(10).keys()].map(String)}
                reference={data.data.stats.last2.n_draws / 10}
              />
            </Card>
            <Card>
              <CardHeader title="หลักหน่วย" subtitle="ความถี่ของเลขหลักหน่วย 0–9" />
              <HistogramChart
                label="ความถี่หลักหน่วย"
                values={data.data.stats.last2.units_counts}
                labels={[...Array(10).keys()].map(String)}
                reference={data.data.stats.last2.n_draws / 10}
              />
            </Card>
          </div>

          {data.data.stats.first_prize && (
            <Card>
              <CardHeader
                title="รางวัลที่ 1: การกระจายรายหลัก"
                subtitle={`${data.data.stats.first_prize.n_draws} งวด · เส้นประ = ค่าคาดหวังถ้าสุ่มสม่ำเสมอ · p = chi-square รายหลัก`}
              />
              <PositionalChart counts={data.data.stats.first_prize.positional_counts} chi={data.data.stats.first_prize.positional_chi_square} />
              <div className="mt-6">
                <h3 className="text-sm font-medium">ผลรวมตัวเลข 6 หลัก</h3>
                <p className="text-xs text-ink-2">ค่าเฉลี่ย {data.data.stats.first_prize.digit_sum_mean.toFixed(1)} (ทฤษฎี 27.0)</p>
                <HistogramChart
                  label="ฮิสโตแกรมผลรวมตัวเลขรางวัลที่ 1"
                  values={data.data.stats.first_prize.digit_sum_hist.slice(5, 50)}
                  labels={[...Array(45).keys()].map((i) => String(i + 5))}
                />
              </div>
            </Card>
          )}

          <RecentDraws dataset={data.data.dataset} />
        </>
      )}
    </div>
  );
}

function SourceBanner({ dataset }: { dataset: Dataset }) {
  if (dataset.synthetic) {
    return (
      <div className="flex gap-3 rounded-xl border border-warn/40 bg-warn/10 p-4 text-sm">
        <AlertTriangle className="mt-0.5 shrink-0 text-warn" size={18} aria-hidden />
        <div>
          <b className="text-ink">ข้อมูลจำลอง ไม่ใช่ผลจริง</b>
          <p className="text-ink-2">
            หวยลาวพัฒนาไม่มีแหล่งข้อมูลทางการแบบ API ชุดนี้สร้างแบบสุ่มสม่ำเสมอตามตาราง จ./พ./ศ. เพื่อใช้เป็นกรณีอ้างอิง
            (null hypothesis) นำเข้าผลจริงได้ด้วย <code className="rounded bg-raised px-1">import-lao</code>
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-xs text-ink-2">
      <Database size={14} aria-hidden />
      <span>{dataset.source}</span>
      {dataset.updated_at && <Badge>อัปเดต {thaiDate(dataset.updated_at.slice(0, 10))}</Badge>}
    </div>
  );
}

function Tiles({ dataset, n, p }: { dataset: Dataset; n: number; p: number }) {
  const last = dataset.draws.at(-1);
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label="จำนวนงวดที่วิเคราะห์" value={n.toLocaleString()} hint={`${LOTTERY_LABEL[dataset.lottery]} · ทั้งหมด ${dataset.draws.length} งวด`} />
      <Stat
        label="งวดล่าสุด"
        value={<span className="tnum">{last?.last2 ?? "–"}</span>}
        hint={last ? `${thaiDate(last.date)}${last.first_prize ? ` · รางวัลที่ 1 ${last.first_prize}` : ""}` : undefined}
      />
      <Stat
        label="Chi-square (สุ่มสม่ำเสมอ?)"
        value={<span className="tnum">p = {fmtP(p)}</span>}
        hint={p >= 0.05 ? "สอดคล้องกับการสุ่มล้วน (p ≥ 0.05)" : "เบี่ยงจากสม่ำเสมอ — ระวัง multiple testing"}
      />
      <Stat label="โอกาสต่อเลข (ทฤษฎี)" value="1.00%" hint="เลขท้าย 2 ตัว 1 ใน 100 · รางวัลที่ 1 1 ใน 1,000,000" />
    </div>
  );
}

function RankList({ title, rows }: { title: string; rows: CountRow[] }) {
  return (
    <div className="mb-4">
      <h3 className="text-xs font-medium uppercase tracking-wide text-ink-muted">{title}</h3>
      <ul className="mt-2 space-y-1">
        {rows.map((r) => (
          <li key={r.number} className="flex items-center justify-between text-sm">
            <span className="font-semibold tnum">{pad2(r.number)}</span>
            <span className="text-ink-2 tnum">
              {r.count} ครั้ง · z {r.z >= 0 ? "+" : ""}
              {r.z.toFixed(2)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function topGaps(gaps: number[], k: number): [number, number][] {
  return gaps
    .map((g, n) => [n, g] as [number, number])
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, k);
}

function RecentDraws({ dataset }: { dataset: Dataset }) {
  const rows = dataset.draws.slice(-15).reverse();
  const hasFirst = rows.some((r) => r.first_prize);
  return (
    <Card>
      <CardHeader title="ผลย้อนหลัง" subtitle="15 งวดล่าสุด" />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-muted">
              <th className="py-2 pr-4 font-medium">งวดวันที่</th>
              {hasFirst && <th className="py-2 pr-4 font-medium">รางวัลที่ 1</th>}
              <th className="py-2 font-medium">เลขท้าย 2 ตัว</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.date} className="border-b border-line/60 last:border-0">
                <td className="py-2 pr-4 text-ink-2">{thaiDate(r.date)}</td>
                {hasFirst && <td className="py-2 pr-4 font-mono tnum">{r.first_prize}</td>}
                <td className="py-2 font-semibold tnum">{r.last2}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
