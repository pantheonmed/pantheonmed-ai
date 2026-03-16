"""PantheonMed AI — FastAPI Backend."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routes import auth_routes, chat_routes, lab_routes, health_routes

settings = get_settings()
origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()] or ["*"]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: optionally verify DB. Shutdown: cleanup."""
    from app.db.database import engine
    try:
        from sqlalchemy import text
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception:
        pass  # DB not ready — app still runs, routes may fail
    yield
    await engine.dispose()


app = FastAPI(
    title="PantheonMed AI",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers under /api/v1
app.include_router(auth_routes.router, prefix="/api/v1")
app.include_router(chat_routes.router, prefix="/api/v1")
app.include_router(lab_routes.router, prefix="/api/v1")
app.include_router(health_routes.router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "healthy", "version": "1.0.0"}


@app.get("/")
async def root():
    return {"message": "PantheonMed AI Backend is running!", "docs": "/docs"}
