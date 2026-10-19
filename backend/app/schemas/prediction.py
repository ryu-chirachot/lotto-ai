from typing import Literal

from pydantic import BaseModel, Field, model_validator

Lottery = Literal["thai", "lao"]


class Weights(BaseModel):
    frequency: float = Field(1.0, ge=0)
    recency: float = Field(1.0, ge=0)
    markov: float = Field(0.5, ge=0)
    digit_markov: float = Field(0.5, ge=0)
    gap: float = Field(0.5, ge=0)
    uniform: float = Field(1.0, ge=0)


class ModelParams(BaseModel):
    weights: Weights = Weights()
    half_life: float = Field(20.0, gt=0, le=1000)
    markov_alpha: float = Field(0.1, gt=0, le=100)
    window: int | None = Field(None, ge=10)


class BlendRequest(ModelParams):
    lottery: Lottery
    top_k: int = Field(10, ge=1, le=100)


class BacktestRequest(ModelParams):
    lottery: Lottery
    top_k: int = Field(10, ge=1, le=100)
    min_history: int = Field(30, ge=5)
    stake: float = Field(80.0, gt=0)
    payout: float = Field(2000.0, ge=0)


class MonteCarloRequest(BaseModel):
    n_sims: int = Field(20000, ge=100, le=500_000)
    alpha: float = Field(1.0, gt=0)
    uniform_mix: float = Field(0.0, ge=0, le=1)
    window: int | None = Field(None, ge=10)
    top_k: int = Field(20, ge=1, le=200)
    seed: int | None = None
    sum_min: int = Field(0, ge=0, le=54)
    sum_max: int = Field(54, ge=0, le=54)
    max_repeat: int = Field(6, ge=1, le=6)
    even_min: int = Field(0, ge=0, le=6)
    even_max: int = Field(6, ge=0, le=6)
    fixed: dict[int, int] = Field(default_factory=dict, description="position (0-5) -> digit")
    exclude_digits: list[int] = Field(default_factory=list)

    @model_validator(mode="after")
    def check_ranges(self) -> "MonteCarloRequest":
        if self.sum_min > self.sum_max or self.even_min > self.even_max:
            raise ValueError("min must be <= max")
        if any(not 0 <= p <= 5 or not 0 <= d <= 9 for p, d in self.fixed.items()):
            raise ValueError("fixed must map positions 0-5 to digits 0-9")
        if any(not 0 <= d <= 9 for d in self.exclude_digits):
            raise ValueError("exclude_digits must be 0-9")
        return self


class DrawOut(BaseModel):
    date: str
    last2: str
    first_prize: str | None = None


class DatasetOut(BaseModel):
    lottery: Lottery
    source: str
    synthetic: bool
    updated_at: str | None
    draws: list[DrawOut]
