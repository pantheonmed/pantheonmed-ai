from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        from app.db.database import create_tables
        await create_tables()
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.warning(f"DB setup warning (non-fatal): {e}")
    yield
    logger.info("Shutting down")

app = FastAPI(title="PantheonMed AI", version="1.0.0", docs_url="/docs", redoc_url="/redoc", lifespan=lifespan)

try:
    from app.config import settings
    origins = settings.ALLOWED_ORIGINS
except:
    origins = ["*"]

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

try:
    from app.routes.auth_routes import router as auth_router
    from app.routes.chat_routes import router as chat_router
    from app.routes.lab_routes import router as lab_router
    from app.routes.health_routes import router as health_router
    app.include_router(auth_router, prefix="/api/v1")
    app.include_router(chat_router, prefix="/api/v1")
    app.include_router(lab_router, prefix="/api/v1")
    app.include_router(health_router, prefix="/api/v1")
    logger.info("All routes loaded successfully")
except Exception as e:
    logger.error(f"Route loading error: {e}")

@app.get("/health")
async def health():
    return {"status": "healthy", "version": "1.0.0"}

@app.get("/")
async def root():
    return {"message": "PantheonMed AI Backend Running", "docs": "/docs"}
