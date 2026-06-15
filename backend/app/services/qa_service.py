import json
import uuid

from fastapi import HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.chunk_repository import ChunkRepository
from app.repositories.document_repository import DocumentRepository
from app.repositories.qa_repository import QARepository
from app.services import gemini_service


class QAService:
    def __init__(self, db: AsyncSession):
        self.doc_repo = DocumentRepository(db)
        self.chunk_repo = ChunkRepository(db)
        self.qa_repo = QARepository(db)

    async def ask(self, doc_id: uuid.UUID, user_id: uuid.UUID, question: str, gemini_key: str):
        doc = await self.doc_repo.get_by_id(doc_id)
        if not doc or doc.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

        query_embedding = await gemini_service.embed_query(question, gemini_key)
        similar_chunks = await self.chunk_repo.get_similar(query_embedding, doc_id, top_k=5)

        context = [c.content for c in similar_chunks]
        answer = await gemini_service.answer_question(question, context, gemini_key)

        sources = [
            {"chunk_id": str(c.id), "chunk_index": c.chunk_index, "excerpt": c.content[:200]}
            for c in similar_chunks
        ]
        return await self.qa_repo.create(doc_id, question, answer, sources)

    async def ask_stream_response(
        self, doc_id: uuid.UUID, user_id: uuid.UUID, question: str, gemini_key: str
    ) -> StreamingResponse:
        doc = await self.doc_repo.get_by_id(doc_id)
        if not doc or doc.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

        query_embedding = await gemini_service.embed_query(question, gemini_key)
        similar_chunks = await self.chunk_repo.get_similar(query_embedding, doc_id, top_k=5)

        context = [c.content for c in similar_chunks]
        sources = [
            {"chunk_id": str(c.id), "chunk_index": c.chunk_index, "excerpt": c.content[:200]}
            for c in similar_chunks
        ]

        qa_repo = self.qa_repo

        async def event_generator():
            full_answer_parts: list[str] = []
            try:
                async for token in gemini_service.answer_question_stream(question, context, gemini_key):
                    full_answer_parts.append(token)
                    # JSON-encode each token so newlines and special chars are safe in SSE data
                    yield f"data: {json.dumps(token)}\n\n"
                yield "data: [DONE]\n\n"
            finally:
                if full_answer_parts:
                    await qa_repo.create(doc_id, question, "".join(full_answer_parts), sources)

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            },
        )

    async def get_history(self, doc_id: uuid.UUID, user_id: uuid.UUID):
        doc = await self.doc_repo.get_by_id(doc_id)
        if not doc or doc.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
        return await self.qa_repo.get_by_document(doc_id)
