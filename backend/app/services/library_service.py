import math
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.chunk_repository import ChunkRepository

SIMILARITY_THRESHOLD = 0.65


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


class LibraryService:
    def __init__(self, db: AsyncSession):
        self.chunk_repo = ChunkRepository(db)

    async def get_similarity_map(self, user_id: uuid.UUID) -> dict:
        docs = await self.chunk_repo.get_all_doc_centroids(user_id)

        nodes = [
            {
                "id": d["id"],
                "title": d["title"],
                "word_count": d["word_count"],
                "file_type": d["file_type"],
            }
            for d in docs
            if d["centroid"] is not None
        ]

        valid_docs = [d for d in docs if d["centroid"] is not None]
        edges = []
        for i in range(len(valid_docs)):
            for j in range(i + 1, len(valid_docs)):
                sim = _cosine_similarity(valid_docs[i]["centroid"], valid_docs[j]["centroid"])
                if sim >= SIMILARITY_THRESHOLD:
                    edges.append({
                        "source": valid_docs[i]["id"],
                        "target": valid_docs[j]["id"],
                        "similarity": round(sim, 4),
                    })

        return {"nodes": nodes, "edges": edges}
