# CLAUDE.md - LottoAI: Thai & Lao Lottery Statistical Analytics Platform

## 1. Project Overview & Core Philosophy
Build a full-stack statistical analytics, probability simulation, and trend intelligence platform for two lottery systems:
1. **Thai Government Lottery (สลากกินแบ่งรัฐบาล):**
   - **First Prize (รางวัลที่ 1):** 6-digit number (`000000` - `999999`), drawn twice a month (1st and 16th).
   - **Last 2 Digits (เลขท้าย 2 ตัว):** 2-digit number (`00` - `99`), drawn twice a month.
2. **Lao Development Lottery (หวยลาวพัฒนา):**
   - **Last 2 Digits (เลขท้าย 2 ตัว):** 2-digit number (`00` - `99`), drawn 3 times a week (Monday, Wednesday, Friday).

**Core Principle:** Treat lottery draws as independent stochastic events. Instead of claiming 100% deterministic prediction, provide probability distributions, Markov state transitions, positional digit frequencies, Monte Carlo simulations, and backtesting tools.

---

## 2. Tech Stack & Architecture
Use a clean Monorepo structure separating Backend (Python/FastAPI) and Frontend (Next.js/TypeScript).

### Backend (`/backend`)
- **Language & Framework:** Python 3.11+, FastAPI, Uvicorn, Pydantic v2
- **Database & ORM:** SQLite (for local development/MVP) upgradable to PostgreSQL via SQLAlchemy 2.0 / SQLModel
- **Data Science & ML:** NumPy, Pandas, SciPy, Scikit-learn
- **Scraping & Scheduling:** HTTPX, BeautifulSoup4 / Playwright, APScheduler

### Frontend (`/frontend`)
- **Framework:** Next.js 14+ (App Router), TypeScript
- **Styling & UI:** Tailwind CSS, Lucide Icons, shadcn/ui components
- **Visualization:** Apache ECharts (`echarts-for-react`) or Recharts for $10 \times 10$ Heatmaps (`00`-`99`) and positional bar charts

---

## 3. Repository Directory Structure
```text
lotto-ai/
├── CLAUDE.md
├── docker-compose.yml
├── backend/
│   ├── pyproject.toml / requirements.txt
│   ├── app/
│   │   ├── main.py                 # FastAPI entrypoint & CORS setup
│   │   ├── config.py               # Environment variables
│   │   ├── database.py             # DB session & initialization
│   │   ├── models/                 # SQLModel / SQLAlchemy schemas
│   │   │   └── lottery.py
│   │   ├── schemas/                # Pydantic request/response schemas
│   │   │   └── prediction.py
│   │   ├── engines/                # Core Mathematical & AI Modules
│   │   │   ├── stats_engine.py     # Hot/Cold numbers, positional frequency
│   │   │   ├── markov_engine.py    # 100x100 Transition Matrix for 2-digit draws
│   │   │   ├── montecarlo_6d.py    # 6-digit First Prize simulator with constraints
│   │   │   ├── blender.py          # Custom weight ensemble scorer
│   │   │   └── backtester.py       # Historical ROI & hit-rate evaluation
│   │   ├── scrapers/               # Historical data loaders & seed generators
│   │   │   └── seed_data.py        # Realistic historical dataset generator/loader
│   │   └── api/
│   │       └── routes.py           # REST API endpoints
│   └── tests/
│       └── test_engines.py         # Pytest unit tests for math engines
└── frontend/
    ├── package.json
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx            # Main Dashboard (Thai & Lao tabs)
    │   │   ├── simulator/page.tsx  # Custom Weight AI Generator & Monte Carlo
    │   │   └── backtest/page.tsx   # Strategy Backtesting Sandbox
    │   ├── components/
    │   │   ├── Heatmap2D.tsx       # 10x10 Grid for 00-99 probabilities
    │   │   ├── PositionalChart.tsx # 6-digit positional distribution (Thai 1st Prize)
    │   │   ├── WeightSliders.tsx   # Interactive sliders for algorithm blending
    │   │   └── BacktestChart.tsx   # Cumulative accuracy & ROI chart
    │   └── lib/
    │       └── api.ts              # Typed API client
---

## 4. Deployment: GitHub Pages
- Repo: `ryu-chirachot/lotto-ai`. Site: https://ryu-chirachot.github.io/lotto-ai/
- GitHub Pages serves static files only, so the frontend is a Next.js static export (`output: "export"`, `basePath` from `NEXT_PUBLIC_BASE_PATH`).
- The math engines exist twice and must stay in sync: `backend/app/engines/*.py` and `frontend/src/lib/engines/*.ts`. Change both, then compare outputs on the real datasets.
- `frontend/src/lib/api.ts` runs the TS engines on `public/data/*.json` by default. It calls FastAPI only when `NEXT_PUBLIC_API_URL` is set.
- Canonical data: `backend/data/{thai,lao}_draws.json`. Thai data comes from the GLO API (`app/scrapers/glo.py`). Lao data is synthetic until real results are imported with `import-lao`; the UI must keep labelling it synthetic.
- `.github/workflows/deploy.yml` fetches new results daily, runs pytest, commits data, builds, and deploys.
