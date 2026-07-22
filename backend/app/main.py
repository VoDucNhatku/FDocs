import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from google.api_core.exceptions import ResourceExhausted

from app.middlewares.error_handler import (
    gemini_quota_handler,
    gemini_service_error_handler,
    resource_exhausted_handler,
    unhandled_exception_handler,
)
from app.routes import auth, documents, analysis, qa, library, upload
from app.services.gemini_service import GeminiQuotaError, GeminiServiceError

logging.basicConfig(level=logging.INFO)
from contextlib import asynccontextmanager
import os
import asyncpg

async def _run_schema():
    """Run the migration SQL using a direct asyncpg connection."""
    schema_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "migrations", "0001_initial_schema.sql")
    if not os.path.exists(schema_path):
        logging.warning(f"Schema file not found: {schema_path}")
        return "schema file not found"
    with open(schema_path, "r", encoding="utf-8") as f:
        sql_script = f.read()
    # Build a plain asyncpg DSN from the SQLAlchemy DATABASE_URL
    dsn = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(dsn)
    try:
        await conn.execute(sql_script)
        logging.info("Database initialized successfully.")
        return "ok"
    except Exception as e:
        logging.warning(f"Database initialization info: {e}")
        return str(e)
    finally:
        await conn.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await _run_schema()
    yield

app = FastAPI(title="FDocs API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(GeminiQuotaError, gemini_quota_handler)
app.add_exception_handler(GeminiServiceError, gemini_service_error_handler)
app.add_exception_handler(ResourceExhausted, resource_exhausted_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(analysis.router)
app.include_router(qa.router)
app.include_router(library.router)
app.include_router(upload.router)


@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/init-db-debug")
async def init_db_debug():
    try:
        result = await _run_schema()
        return {"status": "ok" if result == "ok" else "error", "detail": result}
    except Exception as e:
        return {"status": "error", "error": str(e)}

