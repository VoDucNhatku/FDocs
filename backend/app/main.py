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
from app.database import engine

@asynccontextmanager
async def lifespan(app: FastAPI):
    schema_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "migrations", "0001_initial_schema.sql")
    if os.path.exists(schema_path):
        with open(schema_path, "r", encoding="utf-8") as f:
            sql_script = f.read()
        async with engine.connect() as conn:
            raw = await conn.get_raw_connection()
            raw_conn = raw.dbapi_connection
            try:
                await raw_conn.execute(sql_script)
                logging.info("Database initialized successfully.")
            except Exception as e:
                logging.warning(f"Database initialization info: {e}")
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
    schema_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "migrations", "0001_initial_schema.sql")
    with open(schema_path, "r", encoding="utf-8") as f:
        sql_script = f.read()

    try:
        async with engine.connect() as conn:
            raw = await conn.get_raw_connection()
            raw_conn = raw.dbapi_connection
            await raw_conn.execute(sql_script)
        return {"status": "ok", "message": "All tables created successfully"}
    except Exception as e:
        return {"status": "error", "error": str(e)}
