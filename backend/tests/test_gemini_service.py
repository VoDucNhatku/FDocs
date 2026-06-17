"""Unit test cho gemini_service — chunking (pure) + parsing output Gemini (mock model).

Mock _make_client để không gọi mạng; tập trung verify logic strip ```json fence
và parse JSON — phần dễ vỡ nhất khi LLM trả về text bọc markdown.
"""
import json

import pytest

from app.services import gemini_service


async def _no_sleep(_seconds):
    """Patch asyncio.sleep so backoff retries don't add real wall-clock to tests."""


class _FakeResponse:
    def __init__(self, text):
        self.text = text


class _FakeModel:
    def __init__(self, text):
        self._text = text

    async def generate_content_async(self, prompt, **kwargs):
        return _FakeResponse(self._text)


class _FakeEmbeddings:
    """Records constructor + call args so tests can assert model name and dimensionality."""

    captured: dict = {}

    def __init__(self, model, google_api_key):
        _FakeEmbeddings.captured = {"model": model, "api_key": google_api_key}

    def embed_documents(self, texts, output_dimensionality=None):
        _FakeEmbeddings.captured["output_dimensionality"] = output_dimensionality
        return [[0.0] * output_dimensionality for _ in texts]

    def embed_query(self, text, output_dimensionality=None):
        _FakeEmbeddings.captured["output_dimensionality"] = output_dimensionality
        return [0.0] * output_dimensionality


class TestEmbedding:
    async def test_embed_texts_uses_supported_model_and_dim(self, monkeypatch):
        """Regression: text-embedding-004 was shut down (404); model must be gemini-embedding-001
        and output truncated to 768 dims to fit the vector(768) DB column + HNSW index."""
        monkeypatch.setattr(gemini_service, "GoogleGenerativeAIEmbeddings", _FakeEmbeddings)
        result = await gemini_service.embed_texts(["a", "b"], "key")
        assert _FakeEmbeddings.captured["model"] == "models/gemini-embedding-001"
        assert _FakeEmbeddings.captured["output_dimensionality"] == 768
        assert all(len(v) == 768 for v in result)

    async def test_embed_query_uses_supported_model_and_dim(self, monkeypatch):
        monkeypatch.setattr(gemini_service, "GoogleGenerativeAIEmbeddings", _FakeEmbeddings)
        result = await gemini_service.embed_query("question", "key")
        assert _FakeEmbeddings.captured["model"] == "models/gemini-embedding-001"
        assert _FakeEmbeddings.captured["output_dimensionality"] == 768
        assert len(result) == 768

    def test_embedding_dim_matches_db_schema(self):
        """vector(768) in migrations/0001_initial_schema.sql — keep EMBEDDING_DIM in sync."""
        assert gemini_service.EMBEDDING_DIM == 768


class TestEmbeddingErrorTranslation:
    """A 429 from Gemini must surface as GeminiQuotaError (→ HTTP 429), not a raw 500."""

    def _patch(self, monkeypatch, raiser):
        class _Raising:
            def __init__(self, model, google_api_key):
                pass

            def embed_documents(self, texts, output_dimensionality=None):
                raiser()

            def embed_query(self, text, output_dimensionality=None):
                raiser()

        monkeypatch.setattr(gemini_service, "GoogleGenerativeAIEmbeddings", _Raising)
        monkeypatch.setattr(gemini_service.asyncio, "sleep", _no_sleep)

    async def test_quota_message_translated_to_quota_error(self, monkeypatch):
        def raiser():
            raise Exception("Error embedding content: 429 You exceeded your current quota")

        self._patch(monkeypatch, raiser)
        with pytest.raises(gemini_service.GeminiQuotaError):
            await gemini_service.embed_texts(["a"], "key")

    async def test_resource_exhausted_cause_translated_to_quota_error(self, monkeypatch):
        from google.api_core.exceptions import ResourceExhausted

        def raiser():
            # Mirror langchain: wrapper exception whose __cause__ is ResourceExhausted,
            # with a message that does NOT contain "429"/"quota" — exercises isinstance branch.
            try:
                raise ResourceExhausted("rate limited")
            except ResourceExhausted as e:
                raise RuntimeError("Error embedding content") from e

        self._patch(monkeypatch, raiser)
        with pytest.raises(gemini_service.GeminiQuotaError):
            await gemini_service.embed_query("q", "key")

    async def test_generic_error_translated_to_service_error(self, monkeypatch):
        def raiser():
            raise ValueError("malformed response")

        self._patch(monkeypatch, raiser)
        with pytest.raises(gemini_service.GeminiServiceError):
            await gemini_service.embed_texts(["a"], "key")


class _BatchRecordingEmbeddings:
    """Records each batch passed to embed_documents so batching can be asserted."""

    batches: list = []

    def __init__(self, model, google_api_key):
        pass

    def embed_documents(self, texts, output_dimensionality=None):
        _BatchRecordingEmbeddings.batches.append(list(texts))
        return [[0.0] * (output_dimensionality or 1) for _ in texts]


class TestEmbeddingBatching:
    """Long docs are embedded in throttled batches to respect the per-minute quota."""

    def _patch(self, monkeypatch, batch_size, delay):
        monkeypatch.setattr(gemini_service, "_compute_batch_params", lambda n: (batch_size, delay))
        _BatchRecordingEmbeddings.batches = []
        monkeypatch.setattr(gemini_service, "GoogleGenerativeAIEmbeddings", _BatchRecordingEmbeddings)

    async def test_splits_into_batches_preserving_order(self, monkeypatch):
        self._patch(monkeypatch, batch_size=2, delay=0)
        result = await gemini_service.embed_texts(["a", "b", "c", "d", "e"], "key")
        assert _BatchRecordingEmbeddings.batches == [["a", "b"], ["c", "d"], ["e"]]
        assert len(result) == 5

    async def test_sleeps_between_batches_only(self, monkeypatch):
        self._patch(monkeypatch, batch_size=2, delay=1.5)
        sleeps = []

        async def fake_sleep(s):
            sleeps.append(s)

        monkeypatch.setattr(gemini_service.asyncio, "sleep", fake_sleep)
        await gemini_service.embed_texts(["a", "b", "c", "d", "e"], "key")  # 3 batches → 2 delays
        assert sleeps == [1.5, 1.5]

    async def test_single_batch_does_not_sleep(self, monkeypatch):
        self._patch(monkeypatch, batch_size=50, delay=5)
        sleeps = []

        async def fake_sleep(s):
            sleeps.append(s)

        monkeypatch.setattr(gemini_service.asyncio, "sleep", fake_sleep)
        await gemini_service.embed_texts(["a", "b"], "key")
        assert sleeps == []


class TestComputeBatchParams:
    def test_small_doc_single_batch_no_delay(self):
        size, delay = gemini_service._compute_batch_params(30)
        assert size == 30
        assert delay == 0.0

    def test_medium_doc_uses_mid_tier(self):
        size, delay = gemini_service._compute_batch_params(60)
        assert size == 15
        assert delay == 5.0

    def test_large_doc_uses_conservative_tier(self):
        size, delay = gemini_service._compute_batch_params(61)
        assert size == 10
        assert delay == 10.0


class TestChunkText:
    def test_short_text_single_chunk(self):
        chunks = gemini_service.chunk_text("Một đoạn văn bản ngắn.")
        assert len(chunks) == 1

    def test_long_text_multiple_chunks(self):
        long_text = "Linear algebra studies vector spaces. " * 200
        chunks = gemini_service.chunk_text(long_text)
        assert len(chunks) > 1
        assert all(isinstance(c, str) and c for c in chunks)

    def test_empty_text(self):
        assert gemini_service.chunk_text("") == []


class TestExtractKeywords:
    async def test_parses_plain_json_array(self, monkeypatch):
        monkeypatch.setattr(
            gemini_service, "_make_client", lambda key, **kw: _FakeModel('["algebra", "vector", "matrix"]')
        )
        result = await gemini_service.extract_keywords("doc text", "key")
        assert result == ["algebra", "vector", "matrix"]

    async def test_strips_json_code_fence(self, monkeypatch):
        fenced = '```json\n["algebra", "vector"]\n```'
        monkeypatch.setattr(gemini_service, "_make_client", lambda key, **kw: _FakeModel(fenced))
        result = await gemini_service.extract_keywords("doc text", "key")
        assert result == ["algebra", "vector"]

    async def test_strips_bare_code_fence(self, monkeypatch):
        fenced = '```\n["a", "b"]\n```'
        monkeypatch.setattr(gemini_service, "_make_client", lambda key, **kw: _FakeModel(fenced))
        result = await gemini_service.extract_keywords("doc text", "key")
        assert result == ["a", "b"]


class TestScoreRelevance:
    async def test_parses_and_rounds_score(self, monkeypatch):
        payload = '{"score": 0.82345, "explanation": "Phù hợp cao."}'
        monkeypatch.setattr(gemini_service, "_make_client", lambda key, **kw: _FakeModel(payload))
        result = await gemini_service.score_relevance("text", "goal", ["k1"], "topic", "key")
        assert result["relevance_score"] == 0.823
        assert result["explanation"] == "Phù hợp cao."

    async def test_handles_fenced_json(self, monkeypatch):
        payload = '```json\n{"score": 0.5, "explanation": "Trung bình."}\n```'
        monkeypatch.setattr(gemini_service, "_make_client", lambda key, **kw: _FakeModel(payload))
        result = await gemini_service.score_relevance("text", "goal", [], "topic", "key")
        assert result["relevance_score"] == 0.5


class TestAnswerQuestionStream:
    async def test_yields_only_nonempty_tokens(self, monkeypatch):
        class _StreamChunk:
            def __init__(self, text):
                self.text = text

        class _StreamResp:
            def __aiter__(self):
                async def gen():
                    for t in ["Hello", "", " world", None]:
                        yield _StreamChunk(t)
                return gen()

        class _StreamModel:
            async def generate_content_async(self, prompt, stream=False):
                return _StreamResp()

        monkeypatch.setattr(gemini_service, "_make_client", lambda key, **kw: _StreamModel())
        tokens = [t async for t in gemini_service.answer_question_stream("q", ["ctx"], "key")]
        assert tokens == ["Hello", " world"]


class TestCallWithBackoff:
    """Single choke point: retry transient 429s, map to GeminiQuotaError/ServiceError."""

    async def test_retries_quota_then_succeeds(self, monkeypatch):
        monkeypatch.setattr(gemini_service.asyncio, "sleep", _no_sleep)
        calls = {"n": 0}

        async def factory():
            calls["n"] += 1
            if calls["n"] < 3:
                raise Exception("429 You exceeded your current quota")
            return "ok"

        result = await gemini_service._call_with_backoff(factory, what="test")
        assert result == "ok"
        assert calls["n"] == 3

    async def test_gives_up_after_max_retries_raises_quota(self, monkeypatch):
        monkeypatch.setattr(gemini_service.asyncio, "sleep", _no_sleep)

        async def factory():
            raise Exception("429 quota")

        with pytest.raises(gemini_service.GeminiQuotaError):
            await gemini_service._call_with_backoff(factory, what="test", max_retries=2)

    async def test_non_quota_maps_to_service_error_without_retry(self, monkeypatch):
        calls = {"n": 0}

        async def factory():
            calls["n"] += 1
            raise ValueError("malformed")

        with pytest.raises(gemini_service.GeminiServiceError):
            await gemini_service._call_with_backoff(factory, what="test")
        assert calls["n"] == 1  # non-quota errors are not retried

    async def test_long_retry_after_gives_up_without_sleeping(self, monkeypatch):
        slept: list = []

        async def recording_sleep(s):
            slept.append(s)

        monkeypatch.setattr(gemini_service.asyncio, "sleep", recording_sleep)

        async def factory():
            raise Exception("429 quota; please retry in 30s")

        with pytest.raises(gemini_service.GeminiQuotaError):
            await gemini_service._call_with_backoff(factory, what="test")
        assert slept == []  # retry_after 30s > ceiling → immediate give-up


class TestIsQuotaError:
    def test_detects_resource_exhausted_deep_in_cause_chain(self):
        from google.api_core.exceptions import ResourceExhausted

        try:
            try:
                raise ResourceExhausted("rate limited")
            except ResourceExhausted as inner:
                raise RuntimeError("wrapper with no quota words") from inner
        except RuntimeError as e:
            assert gemini_service._is_quota_error(e) is True

    def test_detects_via_message_substring(self):
        assert gemini_service._is_quota_error(Exception("Error: 429 quota")) is True

    def test_non_quota_is_false(self):
        assert gemini_service._is_quota_error(ValueError("bad json")) is False


class TestExtractTextGuard:
    def test_blocked_candidate_becomes_service_error(self):
        class _Blocked:
            candidates: list = []

            @property
            def text(self):
                raise ValueError("no valid Part; finish_reason is SAFETY")

        with pytest.raises(gemini_service.GeminiServiceError):
            gemini_service._extract_text(_Blocked(), "trả lời")


class TestGenerateSummary:
    async def test_short_text_single_call(self, monkeypatch):
        calls = {"n": 0}

        class _M:
            async def generate_content_async(self, prompt, **kw):
                calls["n"] += 1
                return _FakeResponse("tóm tắt ngắn")

        monkeypatch.setattr(gemini_service, "_make_client", lambda key, **kw: _M())
        out = await gemini_service.generate_summary("Một đoạn ngắn.", "key")
        assert out == "tóm tắt ngắn"
        assert calls["n"] == 1

    async def test_long_text_map_reduce_not_per_512_char_chunk(self, monkeypatch):
        """Regression: the OLD generate_summary fanned out ~1 call per 512-char chunk
        (>100 calls on a long doc) — the dominant 429 source. Map-reduce over 12k-char
        segments must stay in the single digits."""
        monkeypatch.setattr(gemini_service.asyncio, "sleep", _no_sleep)
        calls = {"n": 0}

        class _M:
            async def generate_content_async(self, prompt, **kw):
                calls["n"] += 1
                return _FakeResponse("partial")

        monkeypatch.setattr(gemini_service, "_make_client", lambda key, **kw: _M())
        text = "Linear algebra studies vector spaces and matrices. " * 1100  # ~56k chars
        out = await gemini_service.generate_summary(text, "key")
        assert isinstance(out, str)
        assert calls["n"] < 15  # OLD impl would be ~100+


class TestGenerateKnowledgeGraph:
    async def test_quota_error_not_swallowed_raises_quota(self, monkeypatch):
        """Regression: old `except (JSONDecodeError, Exception)` swallowed 429 into a
        RuntimeError → HTTP 500. Quota must propagate as GeminiQuotaError → 429."""
        monkeypatch.setattr(gemini_service.asyncio, "sleep", _no_sleep)

        class _M:
            async def generate_content_async(self, prompt, **kw):
                raise Exception("429 quota exceeded")

        monkeypatch.setattr(gemini_service, "_make_json_client", lambda key, schema, **kw: _M())
        with pytest.raises(gemini_service.GeminiQuotaError):
            await gemini_service.generate_knowledge_graph("text", "key")

    async def test_valid_kg_parsed(self, monkeypatch):
        payload = json.dumps({"nodes": [{"id": "1", "label": "A", "type": "concept"}], "edges": []})

        class _M:
            async def generate_content_async(self, prompt, **kw):
                return _FakeResponse(payload)

        monkeypatch.setattr(gemini_service, "_make_json_client", lambda key, schema, **kw: _M())
        out = await gemini_service.generate_knowledge_graph("text", "key")
        assert out["nodes"][0]["id"] == "1"
        assert out["edges"] == []

    async def test_persistently_malformed_json_raises_service_error(self, monkeypatch):
        class _M:
            async def generate_content_async(self, prompt, **kw):
                return _FakeResponse("not json at all")

        monkeypatch.setattr(gemini_service, "_make_json_client", lambda key, schema, **kw: _M())
        with pytest.raises(gemini_service.GeminiServiceError):
            await gemini_service.generate_knowledge_graph("text", "key")


class TestJsonOutputValidation:
    async def test_keywords_non_json_raises_service_error(self, monkeypatch):
        monkeypatch.setattr(gemini_service, "_make_client", lambda key, **kw: _FakeModel("xin lỗi tôi không thể"))
        with pytest.raises(gemini_service.GeminiServiceError):
            await gemini_service.extract_keywords("text", "key")

    async def test_keywords_non_list_raises_service_error(self, monkeypatch):
        monkeypatch.setattr(gemini_service, "_make_client", lambda key, **kw: _FakeModel('{"not": "a list"}'))
        with pytest.raises(gemini_service.GeminiServiceError):
            await gemini_service.extract_keywords("text", "key")

    async def test_relevance_missing_key_raises_service_error(self, monkeypatch):
        monkeypatch.setattr(gemini_service, "_make_client", lambda key, **kw: _FakeModel('{"explanation": "x"}'))
        with pytest.raises(gemini_service.GeminiServiceError):
            await gemini_service.score_relevance("t", "g", [], "topic", "key")

    async def test_time_plan_non_list_raises_service_error(self, monkeypatch):
        monkeypatch.setattr(gemini_service, "_make_client", lambda key, **kw: _FakeModel('{"oops": true}'))
        with pytest.raises(gemini_service.GeminiServiceError):
            await gemini_service.generate_time_plan(None, 100, "2026-06-16", "2026-06-20", 2.0, "key")


class TestRetryBudget:
    """Q&A path embed_query uses a smaller retry budget than ingestion embed_texts
    so embed + answer combined stay under the Q&A < 10s NFR."""

    def _patch_always_quota(self, monkeypatch, counter):
        class _Raising:
            def __init__(self, model, google_api_key):
                pass

            def embed_documents(self, texts, output_dimensionality=None):
                counter["n"] += 1
                raise Exception("429 quota exceeded")

            def embed_query(self, text, output_dimensionality=None):
                counter["n"] += 1
                raise Exception("429 quota exceeded")

        monkeypatch.setattr(gemini_service, "GoogleGenerativeAIEmbeddings", _Raising)
        monkeypatch.setattr(gemini_service.asyncio, "sleep", _no_sleep)

    async def test_embed_query_caps_at_two_retries(self, monkeypatch):
        counter = {"n": 0}
        self._patch_always_quota(monkeypatch, counter)
        with pytest.raises(gemini_service.GeminiQuotaError):
            await gemini_service.embed_query("q", "key")
        assert counter["n"] == 3  # 1 initial + 2 retries (max_retries=2)

    async def test_embed_texts_uses_default_retry_budget(self, monkeypatch):
        counter = {"n": 0}
        self._patch_always_quota(monkeypatch, counter)
        with pytest.raises(gemini_service.GeminiQuotaError):
            await gemini_service.embed_texts(["a"], "key")
        assert counter["n"] == 4  # 1 initial + 3 retries (MAX_RETRIES)


class TestSummarySegmentCap:
    async def test_caps_segments_for_very_large_doc(self, monkeypatch):
        """A pathologically long doc must not fan out one map call per segment past
        the cap — bounds the serial map latency under the < 60s summary NFR."""
        monkeypatch.setattr(gemini_service.asyncio, "sleep", _no_sleep)
        calls = {"n": 0}

        class _M:
            async def generate_content_async(self, prompt, **kw):
                calls["n"] += 1
                return _FakeResponse("partial")

        monkeypatch.setattr(gemini_service, "_make_client", lambda key, **kw: _M())
        text = "word " * 120000  # ~600k chars → ~50 segments uncapped
        out = await gemini_service.generate_summary(text, "key")
        assert isinstance(out, str)
        assert calls["n"] <= gemini_service.SUMMARY_MAX_SEGMENTS + 1  # capped map + 1 reduce
