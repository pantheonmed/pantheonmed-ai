from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List

class Settings(BaseSettings):
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
    AI_PROVIDER: str = "gemini"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    ANTHROPIC_API_KEY: str = ""
    CLAUDE_MODEL: str = "claude-haiku-4-5-20251001"
    AI_MAX_TOKENS: int = 2048
    AI_TEMPERATURE: float = 0.3
    AI_MAX_HISTORY_CHARS: int = 40000
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000","http://localhost:5173"]
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 20
    RATE_LIMIT_PER_MINUTE: int = 60
    AI_RATE_LIMIT_PER_MINUTE: int = 20
    LOGIN_RATE_LIMIT_PER_MINUTE: int = 5

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()
