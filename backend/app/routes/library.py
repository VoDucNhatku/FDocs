import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middlewares.auth import get_current_user_id
from app.services.library_service import LibraryService

router = APIRouter(prefix="/api/library", tags=["library"])


@router.get("/similarity-map")
async def get_similarity_map(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await LibraryService(db).get_similarity_map(user_id)
