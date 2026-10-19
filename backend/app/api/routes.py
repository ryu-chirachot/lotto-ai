from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session

from app.database import fetch_draws, get_session
from app.engines import backtester, blender, markov_engine, montecarlo_6d, stats_engine
from app.models import Draw
from app.schemas.prediction import BacktestRequest, BlendRequest, DatasetOut, DrawOut, Lottery, MonteCarloRequest
from app.scrapers import seed_data

router = APIRouter(prefix="/api")


def _draws(session: Session, lottery: str) -> list[Draw]:
    draws = fetch_draws(session, lottery)
    if not draws:
        raise HTTPException(404, f"No draws loaded for {lottery}")
    return draws


def _last2(draws: list[Draw]) -> list[int]:
    return [int(d.last2) for d in draws]


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}


@router.get("/draws/{lottery}", response_model=DatasetOut)
def draws(lottery: Lottery, session: Session = Depends(get_session)) -> DatasetOut:
    meta = seed_data.load(lottery)
    rows = fetch_draws(session, lottery)
    return DatasetOut(
        lottery=lottery,
        source=meta["source"],
        synthetic=meta.get("synthetic", False),
        updated_at=meta.get("updated_at"),
        draws=[DrawOut(date=d.draw_date.isoformat(), last2=d.last2, first_prize=d.first_prize) for d in rows],
    )


@router.get("/stats/{lottery}")
def stats(
    lottery: Lottery,
    window: int | None = Query(None, ge=10),
    top_k: int = Query(10, ge=1, le=50),
    session: Session = Depends(get_session),
) -> dict:
    rows = _draws(session, lottery)
    firsts = [d.first_prize for d in rows if d.first_prize]
    return {
        "last2": stats_engine.summary_2d(_last2(rows), window, top_k),
        "first_prize": stats_engine.summary_6d(firsts, window) if firsts else None,
    }


@router.get("/markov/{lottery}")
def markov(
    lottery: Lottery,
    alpha: float = Query(0.1, gt=0, le=100),
    window: int | None = Query(None, ge=10),
    session: Session = Depends(get_session),
) -> dict:
    seq = _last2(_draws(session, lottery))
    return markov_engine.markov_summary(seq[-window:] if window else seq, alpha)


@router.post("/blend")
def blend(req: BlendRequest, session: Session = Depends(get_session)) -> dict:
    seq = _last2(_draws(session, req.lottery))
    return blender.blend_report(
        seq, req.weights.model_dump(), req.top_k, half_life=req.half_life, markov_alpha=req.markov_alpha, window=req.window
    )


@router.post("/backtest")
def backtest(req: BacktestRequest, session: Session = Depends(get_session)) -> dict:
    rows = _draws(session, req.lottery)
    return backtester.backtest(
        _last2(rows),
        req.weights.model_dump(),
        top_k=req.top_k,
        min_history=req.min_history,
        stake=req.stake,
        payout=req.payout,
        half_life=req.half_life,
        markov_alpha=req.markov_alpha,
        window=req.window,
        dates=[d.draw_date.isoformat() for d in rows],
    )


@router.post("/montecarlo")
def montecarlo(req: MonteCarloRequest, session: Session = Depends(get_session)) -> dict:
    firsts = [d.first_prize for d in _draws(session, "thai") if d.first_prize]
    if req.window:
        firsts = firsts[-req.window :]
    constraints = montecarlo_6d.Constraints(
        sum_min=req.sum_min,
        sum_max=req.sum_max,
        max_repeat=req.max_repeat,
        even_min=req.even_min,
        even_max=req.even_max,
        fixed=req.fixed,
        exclude_digits=req.exclude_digits,
    )
    try:
        return montecarlo_6d.simulate(firsts, req.n_sims, req.alpha, req.uniform_mix, constraints, req.top_k, req.seed)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
