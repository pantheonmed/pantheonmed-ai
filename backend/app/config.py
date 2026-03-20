from pathlib import Path
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


# Resolve .env path: backend/.env or project root .env
_BACKEND_DIR = Path(__file__).resolve().parent.parent
_ENV_PATHS = [_BACKEND_DIR / ".env", _BACKEND_DIR.parent / ".env"]


class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    ANTHROPIC_API_KEY: str = ""
    CLAUDE_MODEL: str = "claude-haiku-4-5-20251001"
    AI_PROVIDER: str = "gemini"
    AI_MAX_TOKENS: int = 2048
    AI_TEMPERATURE: float = 0.3
    AI_MAX_HISTORY_CHARS: int = 40000

    APP_NAME: str = "PantheonMed AI"
    APP_VERSION: str = "1.0.0"
    ENV: str = "development"
    DEBUG: bool = True
    JWT_SECRET: str = "CHANGE-ME-64-CHAR-SECRET"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_EXPIRE_DAYS: int = 7
    DATABASE_URL: str = "postgresql+asyncpg://user:pass@localhost:5432/db"
    REDIS_URL: str = "redis://localhost:6379/0"
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 20
    RATE_LIMIT_PER_MINUTE: int = 60
    AI_RATE_LIMIT_PER_MINUTE: int = 20
    LOGIN_RATE_LIMIT_PER_MINUTE: int = 5

    model_config = SettingsConfigDict(
        env_file=next((str(p) for p in _ENV_PATHS if p.exists()), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    s = Settings()
    loaded = bool(s.GEMINI_API_KEY and str(s.GEMINI_API_KEY).strip())
    print(f"[Config] GEMINI_API_KEY loaded: {'yes' if loaded else 'no'}")
    return s


settings = get_settings()
