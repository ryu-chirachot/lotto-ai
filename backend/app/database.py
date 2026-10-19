from collections.abc import Iterator
from datetime import date

from sqlmodel import Session, SQLModel, create_engine, delete, select

from app.config import settings
from app.models import Draw
from app.scrapers import seed_data

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session


def sync_from_json(lottery: str) -> int:
    """Replace a lottery's rows with the canonical JSON dataset."""
    dataset = seed_data.load(lottery)
    with Session(engine) as session:
        session.exec(delete(Draw).where(Draw.lottery == lottery))
        for row in dataset["draws"]:
            session.add(
                Draw(
                    lottery=lottery,
                    draw_date=date.fromisoformat(row["date"]),
                    first_prize=row.get("first_prize"),
                    last2=row["last2"],
                )
            )
        session.commit()
    return len(dataset["draws"])


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    for lottery in seed_data.LOTTERIES:
        sync_from_json(lottery)


def fetch_draws(session: Session, lottery: str) -> list[Draw]:
    return list(session.exec(select(Draw).where(Draw.lottery == lottery).order_by(Draw.draw_date)))
