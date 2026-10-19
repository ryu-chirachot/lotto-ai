"""Application settings loaded from environment variables (prefix ``LOTTO_``)."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
REPO_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="LOTTO_", env_file=".env", extra="ignore")

    database_url: str = f"sqlite:///{(BACKEND_DIR / 'lotto.db').as_posix()}"
    data_dir: Path = BACKEND_DIR / "data"
    static_export_dir: Path = REPO_DIR / "frontend" / "public" / "data"
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Refresh Thai results from the GLO API on a schedule while the server runs.
    enable_scheduler: bool = False
    glo_api_base: str = "https://www.glo.or.th/api"
    http_timeout: float = 20.0


settings = Settings()
