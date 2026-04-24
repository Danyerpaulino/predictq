from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_DIR.parent


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/predictq"
    openai_api_key: str = ""
    cors_origins: str = "http://localhost:3000"
    polymarket_api_url: str = "https://gamma-api.polymarket.com/markets"
    poll_interval_seconds: int = 45

    model_config = SettingsConfigDict(
        env_file=(REPO_ROOT / ".env", BACKEND_DIR / ".env"),
        extra="ignore",
    )


settings = Settings()
