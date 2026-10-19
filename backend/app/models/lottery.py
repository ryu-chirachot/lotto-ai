from datetime import date

from sqlmodel import Field, SQLModel, UniqueConstraint


class Draw(SQLModel, table=True):
    """One draw result. ``first_prize`` is only set for the Thai lottery."""

    __table_args__ = (UniqueConstraint("lottery", "draw_date"),)

    id: int | None = Field(default=None, primary_key=True)
    lottery: str = Field(index=True)  # "thai" | "lao"
    draw_date: date = Field(index=True)
    first_prize: str | None = Field(default=None, max_length=6)
    last2: str = Field(max_length=2)
