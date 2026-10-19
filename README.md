# LottoAI: สถิติหวยไทย & ลาว

แพลตฟอร์มวิเคราะห์สถิติ ความน่าจะเป็น และการจำลองสำหรับ **สลากกินแบ่งรัฐบาล** (รางวัลที่ 1 และเลขท้าย 2 ตัว) และ **หวยลาวพัฒนา** (เลขท้าย 2 ตัว)

**เว็บไซต์:** https://ryu-chirachot.github.io/lotto-ai/

> ผลการออกรางวัลแต่ละงวดเป็นเหตุการณ์สุ่มที่เป็นอิสระต่อกัน โปรเจคนี้แสดงการกระจายความน่าจะเป็นและทดสอบโมเดลอย่างตรงไปตรงมา
> ไม่ได้อ้างว่าทำนายผลได้ ผล backtest กับข้อมูลจริงไม่ดีกว่าการสุ่มอย่างมีนัยสำคัญ

## ฟีเจอร์

| หน้า | สิ่งที่ทำได้ |
|---|---|
| **ภาพรวม** | Heatmap ความถี่ 10×10 (00–99), เลขร้อน/เย็น/ค้าง พร้อม z-score, chi-square test ความสุ่ม, Markov 100×100 และแบบรายหลัก 10×10, การกระจายรายหลักของรางวัลที่ 1 |
| **AI Simulator** | ผสมโมเดล 6 แบบด้วย slider น้ำหนัก (ความถี่, ความถี่ล่าสุด, Markov, Markov รายหลัก, Gap, สุ่มล้วน) และ Monte Carlo รางวัลที่ 1 พร้อมเงื่อนไข (ผลรวม, เลขคู่, เลขซ้ำ, ตัดเลข, ล็อกหลัก) |
| **Backtest** | ทดสอบแบบ walk-forward (ไม่มี look-ahead), hit rate เทียบ baseline, binomial p-value และ ROI สะสม |

## ข้อมูล

- **หวยไทย:** ผลจริงจาก API สาธารณะของสำนักงานสลากกินแบ่งรัฐบาล (glo.or.th) ตั้งแต่ มี.ค. 2553 อัปเดตอัตโนมัติทุกวันด้วย GitHub Actions
- **หวยลาว:** ยังไม่มีแหล่งข้อมูลทางการแบบ API ชุดปัจจุบันเป็น**ข้อมูลจำลอง**แบบสุ่มสม่ำเสมอตามตาราง จ./พ./ศ. และหน้าเว็บติดป้ายไว้ นำเข้าผลจริงได้จาก CSV (`date,last2`):

  ```bash
  cd backend
  python -m app.scrapers.seed_data import-lao lao_results.csv --source "ชื่อแหล่งข้อมูล"
  ```

## สถาปัตยกรรม

GitHub Pages รันได้แค่ไฟล์ static จึงมี engine สองชุดที่ให้ผลตรงกัน:

```
backend/  (Python, FastAPI)            frontend/  (Next.js static export)
  app/engines/*.py   <-- ตรงกัน -->      src/lib/engines/*.ts   (รันในเบราว์เซอร์)
  app/scrapers/      --> backend/data/*.json --> public/data/*.json
  app/api/routes.py  <-- เรียกเมื่อตั้ง NEXT_PUBLIC_API_URL
```

- **GitHub Pages:** `src/lib/api.ts` โหลด JSON แล้วคำนวณในเบราว์เซอร์
- **Full-stack (local):** ตั้ง `NEXT_PUBLIC_API_URL` แล้ว frontend จะเรียก FastAPI แทน

## การพัฒนา

```bash
# Backend
cd backend
python -m venv .venv && .venv/Scripts/activate   # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
pytest
uvicorn app.main:app --reload                     # http://localhost:8000/docs

# Frontend (static mode)
cd frontend
npm install
npm run dev                                       # http://localhost:3000

# Frontend เรียก backend
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev

# ทั้งสองส่วนด้วย Docker
docker compose up
```

คำสั่งข้อมูล:

```bash
python -m app.scrapers.seed_data update-thai   # ดึงผลไทยงวดใหม่
python -m app.scrapers.seed_data seed-lao      # ต่อข้อมูลลาวจำลองถึงวันนี้
python -m app.scrapers.seed_data export        # เขียน frontend/public/data
```

## Deploy

`.github/workflows/deploy.yml` ทำงานเมื่อ push เข้า `main` และทุกวัน 17:30 น. (เวลาไทย):
ดึงผลใหม่ → รัน pytest → commit ข้อมูล → build Next.js → deploy GitHub Pages

ตั้งค่าครั้งแรก: **Settings → Pages → Source: GitHub Actions**

## API

| Method | Path | คำอธิบาย |
|---|---|---|
| GET | `/api/draws/{thai\|lao}` | ผลย้อนหลังทั้งหมด |
| GET | `/api/stats/{lottery}?window=` | ความถี่, gap, hot/cold, chi-square, รายหลัก |
| GET | `/api/markov/{lottery}?alpha=&window=` | การกระจายเลขถัดไปจาก Markov |
| POST | `/api/blend` | คะแนนโมเดลผสมตามน้ำหนัก |
| POST | `/api/backtest` | Walk-forward backtest |
| POST | `/api/montecarlo` | Monte Carlo รางวัลที่ 1 |
