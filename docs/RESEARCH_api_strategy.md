# Research: Gemini API Usage Strategy & Risk Audit

> **Worker**: Research Worker (`/as-researcher`)
> **Ngày**: 2026-06-16
> **Phạm vi**: Audit chiến lược dùng Gemini API (rate limit/quota) + các failure mode của từng lệnh gọi AI trong backend FDocs.
> **Phương pháp**: Đọc trực tiếp source (`gemini_service.py`, `document_service.py`, `analysis_service.py`, `qa_service.py`, `error_handler.py`, `main.py`, `schemas/document.py`, route `documents.py`) + kiểm tra source `langchain_google_genai` đã cài trong `.venv` + tra cứu giới hạn free-tier. Các tuyên bố định lượng được **xác minh đối kháng độc lập** (đọc lại code thật để cố bác bỏ).
> **Lưu ý độ tin cậy**: 16/30 tuyên bố được xác minh trọn vẹn (13 confirmed, 2 refuted, 1 uncertain — đã áp dụng correction). Phần audit Part 2 dựa trên đọc code trực tiếp (đã đối chiếu thủ công). Các con số free-tier là **ước lượng bảo thủ** — Google không còn công bố số chính xác (xem Part 1.D).

---

## Root Cause Analysis

Vấn đề "429/500 khi xử lý tài liệu dài" **không** nằm ở bước embedding như trực giác ban đầu. Bước embedding (`embed_texts`) thực ra đã được throttle và **sống sót** qua rate limit. Có hai nguyên nhân gốc rễ độc lập:

1. **`generate_summary` là kiến trúc sai** (nguyên nhân 429 chính). Nó **sao chép cách chunk của `embed_texts` nhưng bỏ mất phần throttle**: chia lại toàn bộ text thành ~chục–trăm chunk rồi gọi `generate_content_async` **tuần tự, một lần/chunk, không delay, không batch, không retry**. Với tài liệu dài đây là một burst hàng trăm request lên model generation — vốn có RPM thấp nhất (free tier ~5–15 RPM) → 429 gần như tức thì.

2. **Bước ingestion đồng bộ + không giới hạn payload là nguyên nhân 500/504**. `create_document` chạy embedding **bên trong** request HTTP. Tài liệu dài → `embed_texts` ngủ cưỡng bức 100–170s → vượt NFR (parse 20 trang < 5s, không nói rõ ingestion nhưng ngụ ý nhanh) và có nguy cơ 504 ở proxy/nginx. Schema `DocumentCreateRequest` **không giới hạn độ dài `extracted_text`** → không có trần cho số chunk.

Cộng thêm hai vấn đề về **độ quan sát lỗi (observability)**:

3. **Ánh xạ lỗi quota không nhất quán**: chỉ path embedding map sang `GeminiQuotaError`. Path generation dựa vào handler `ResourceExhausted` toàn cục (→429) — đúng, *trừ* `generate_knowledge_graph` nuốt mất lỗi quota và trả **500**, và stream Q&A không thể trả 429 sau khi đã commit status 200.

4. **JSON parse trần trụi** ở keywords/relevance/time-plan → output lỗi của model rò ra thành **500 "Internal server error"** mờ mịt, làm lu mờ tín hiệu quota thật.

> **Phát hiện gốc quan trọng nhất** (đã xác minh): `chunk_size=512` là **512 KÝ TỰ, không phải token**. `RecursiveCharacterTextSplitter` mặc định `length_function=len` → đếm ký tự. 512 ký tự ≈ 110–130 token, nên chunk nhỏ hơn nhiều so với suy nghĩ theo token → **số chunk bị thổi phồng ~4–5×** so với cách hiểu theo token. Đây là biến số chi phối mọi con số phía sau.

---

## Part 1 — API Rate Limit Strategy

### A. Quota Pressure Analysis — tài liệu học thuật ~8.000 từ (~49.000 ký tự)

**Số chunk** (đã xác minh bằng cách chạy splitter thật):

| Loại input | Số chunk |
|---|---|
| Text liền không separator (packed lower bound) | `ceil(49.000 / 462) = 106` |
| Văn xuôi học thuật thực tế (splitter ngắt sớm ở `\n\n`, `\n`, câu, space) | **~130–175** (test: 137 ở mật độ câu ~8 từ; 173 ở ~12 từ) |

> ⚠️ **Correction sau verification**: ước lượng ban đầu "~115 chunk" bị **bác bỏ** — nó hiểu ngược logic. Vì splitter dừng *trước* khi chạm 512 ký tự tại ranh giới ngữ nghĩa, chunk thực tế ngắn hơn 512 → **nhiều chunk hơn**, không phải ít. Dùng **~150 làm con số đại diện thực tế**, biên trên ~175. Net advance lý tưởng = `512 − 50 = 462` ký tự/chunk chỉ đúng cho text liền.

**Embedding API calls (ingestion `embed_texts`)** — đã xác minh:

- `N > 60` → `_compute_batch_params` trả `(batch_size=10, delay=10.0s)`.
- `langchain GoogleGenerativeAIEmbeddings.embed_documents` phát **một** `batch_embed_contents` RPC **mỗi batch** (không phải 1 request/text — đã xác minh trong `.venv/.../langchain_google_genai/embeddings.py:207-232`).
- Số batch = `ceil(N/10)`; số `asyncio.sleep(10)` = `số_batch − 1`.

| N chunk | Số RPC embed | Số sleep × 10s | Forced sleep |
|---|---|---|---|
| 106 | 11 | 10 | 100s |
| 150 | 15 | 14 | 140s |
| 175 | 18 | 17 | 170s |

> ⚠️ **Correction (uncertain)**: tuyên bố "cố định 11 sleep = 110s" chỉ đúng cho `N ∈ [111,120]`. Đúng là `(số_batch − 1)` sleep, **co giãn theo số chunk**. Forced-sleep ~**100–170s** cho tài liệu dài là phần xác minh được từ code; tổng wall-clock còn cộng latency RPC thật của Gemini (không đo được từ code).

**Generation calls — chạy đủ feature** (summary → keywords → relevance → time-plan → KG → Q&A ×3), đã xác minh shape:

| Feature | Số generation call | Ghi chú |
|---|---|---|
| **Summary** | **`N + 1`** (≈ **151** ở N=150) | ⚠️ Nguy hiểm nhất. Re-chunk cùng text → 1 call/chunk **tuần tự, không throttle**, + 1 call synthesis. |
| Keywords | 1 | `text[:8000]` |
| Relevance | 1 | `text[:6000]` |
| Time Plan | 1 | Chỉ gửi metadata, không gửi text |
| Knowledge Graph | **1–3** | có retry `range(3)`; lỗi → retry tới 3 lần |
| Q&A ×3 | 3 generation (+3 embed) | mỗi câu: 1 `embed_query` + 1 generate |
| **TỔNG generation** | **`≈ N + 7 .. N + 9`** (≈ **157–159** ở N=150) | **Summary chiếm ~95%** (≈94–96%) toàn bộ traffic generation |

> ⚠️ **Correction**: tuyên bố "tổng = 122, summary 95%" bị **bác bỏ về con số** (sai số học + dựa trên N giả định cố định + KG không phải luôn 1). **Shape thì đúng**: summary áp đảo. Tổng đúng là hàm theo N: `N + 7` (KG thành công) đến `N + 9` (KG retry tối đa).

**Giới hạn nào vỡ trước?** (đã xác minh kết luận định tính):

> **Generation RPM của `gemini-2.0-flash` (free ~5–15 RPM) vỡ ĐẦU TIÊN, ngay trong bước SUMMARY.** Ở 5 RPM, request thứ ~6 trong 60s đầu đã nhận 429. Bước này vỡ rất lâu *trước* mọi giới hạn khác: generation RPD (~200–1.500/ngày, chỉ tốn ~N call), generation TPM (chunk nhỏ ~150 token), embedding RPM (ingestion bị throttle ~6 batch/phút), embedding RPD (~11–18 request/tài liệu).
>
> **Song song**, ngay cả khi không có rate limit: ~150 call tuần tự × ~1–2s = **2–4+ phút** → vượt timeout HTTP/proxy → **504**. Bước **ingestion embedding cũng vỡ vì LATENCY** (forced-sleep 100–170s), không vì rate limit.

### B. Code Audit — `_compute_batch_params()` & chiến lược batch hiện tại

```python
def _compute_batch_params(n_chunks: int) -> tuple[int, float]:
    if n_chunks <= 30:   return n_chunks, 0.0   # 1 batch, không delay
    elif n_chunks <= 60: return 15, 5.0         # ~ batch 15 / 5s
    else:                return 10, 10.0        # ~ batch 10 / 10s
```

| Câu hỏi audit | Kết luận |
|---|---|
| Delay có giữ trong RPM free-tier không? | **Một phần.** `10 chunk / 10s` = 1 batch RPC mỗi 10s = **~6 RPM batch calls**. An toàn với embedding RPM lịch sử (~100) nhưng **biên giới** với mức đã bị cắt giảm (~5–10 RPM sau 12/2025). |
| Có xử lý header `Retry-After` từ 429 không? | **Không.** Delay hoàn toàn tĩnh, không đọc `retry_delay`/`Retry-After` từ exception. |
| Có exponential backoff không? | **Không.** Chỉ delay cố định giữa batch; **không retry** khi một batch nhận 429 → fail luôn cả ingestion. |
| Path lỗi còn thiếu? | (1) Không backoff/retry trên batch lỗi. (2) `_is_quota_error` **chỉ match chuỗi** vì langchain bọc `ResourceExhausted` trong `GoogleGenerativeAIError` (đã xác minh `embeddings.py:230-231`) → nếu Google đổi text lỗi sẽ tụt nhầm xuống `GeminiServiceError` (502). (3) Delay tĩnh đồng nghĩa **không thích ứng**: key paid bị làm chậm vô ích, free-tier dài vẫn có thể 429. |

**Đánh giá**: chiến lược batch hiện tại là *throttle phòng ngừa thô* — đủ giúp ingestion sống sót về RPM nhưng **trả giá bằng latency lớn** (nguy cơ 504) và **không có lưới an toàn** (0 retry). Quan trọng hơn: **`generate_summary` không hề dùng cơ chế này** dù chunk y hệt.

### C. Strategy Recommendations — đánh giá 6 phương án

| # | Phương án | Độ phức tạp | Dep mới | Hiệu quả | Risk | Phù hợp FDocs (BYOK + FastAPI, chưa có queue) |
|---|---|---|---|---|---|---|
| 1 | **Adaptive delay theo `Retry-After`** | Thấp | Không | Cao (chờ đúng thời gian Google yêu cầu) | Thấp | Rất hợp — dùng làm *cận dưới* thời gian chờ cho #2. Free-tier embed không phải lúc nào cũng trả `Retry-After` → cần fallback. |
| 2 | **Exponential backoff + jitter khi 429** | Thấp | `tenacity` (hoặc ~15 dòng tự viết) | Cao — phủ mọi call, jitter chống thundering herd khi summary loop | Thấp | **Nên làm ngay.** Thay retry thô của KG + bọc `embed_texts` & loop summary. Cần `max_retries` + tổng timeout để không phá NFR (Q&A <10s, summary <60s). |
| 3 | Gọi feature tuần tự + cooldown | Thấp | Không | Trung bình | Trung bình | Hợp một phần — phần lớn việc tuần tự hoá thuộc **frontend**; bị #4 thay thế tốt hơn ở backend. Không nên là giải pháp chính. |
| 4 | **Token-bucket rate limiter per-key** | Trung bình | Không (asyncio.Lock+timestamp) / `aiolimiter`; multi-worker cần Redis | Cao — chủ động giữ dưới RPM từng key | Trung bình | Hợp trung hạn. Bản in-memory ổn cho 1 process; Docker đa worker cần Redis. Đứng sau #1+#2. |
| 5 | **Async job queue** (ARQ vs BackgroundTasks) | Cao | ARQ→Redis; BackgroundTasks→không | Cao — diệt 504 cho doc dài, đúng TODO.md (202 + `job_id` + SSE) | Cao | Hợp chiến lược (đã có roadmap) nhưng việc lớn. **BYOK risk**: không đưa Gemini key vào Redis. Giai đoạn 1 nên dùng BackgroundTasks+SSE, chưa kéo Redis. |
| 6 | **Cache embedding theo `hash(chunk_text)`** | Trung bình | Không (cột Postgres + `hashlib`) | Cao *nếu* trùng nội dung; hit-rate thực **thấp ~5–15%** | Trung bình | Để sau cùng. `CHUNK_OVERLAP=50` khiến lệch 1 ký tự là hash khác → giảm hit-rate. Cần migration cột `(content_hash, model, dim)`. Là tối ưu chi phí, không phải lá chắn 429. |

---

## Part 2 — Feature Call Risk Audit

### Bảng audit từng function

| Function | Call pattern | Retry | 429 → HTTP? | JSON/parse risk | Phân loại |
|---|---|---|---|---|---|
| `embed_texts` | Batch throttled (1 RPC/batch) | ❌ | **429** qua `GeminiQuotaError` (match chuỗi) | Không | ✅ raises-properly |
| `embed_query` | 1 RPC | ❌ | **429** qua `GeminiQuotaError` | Không | ✅ raises-properly |
| `generate_summary` | **N+1 call tuần tự, KHÔNG throttle** | ❌ | 429 qua handler `ResourceExhausted` toàn cục | `response.text` `ValueError` nếu candidate bị safety-block → 500 | ✅ raises (nhưng dễ 429/504) |
| `extract_keywords` | 1 call, `text[:8000]` | ❌ | 429 qua handler toàn cục | **`json.loads` → `JSONDecodeError` → 500 mờ**; không validate `list[str]` | ⚠️ raises-wrong-type |
| `score_relevance` | 1 call, `text[:6000]` | ❌ | 429 qua handler toàn cục | **`JSONDecodeError` / `KeyError['score'|'explanation']` / `float()` `ValueError` → 500** | ⚠️ raises-wrong-type |
| `generate_time_plan` | 1 call (chỉ metadata) | ❌ | 429 qua handler toàn cục | **`JSONDecodeError` → 500**; không validate cấu trúc | ⚠️ raises-wrong-type |
| `generate_knowledge_graph` | 1–3 call (structured output) | ✅ (3 lần) | **❌ SAI → 500** | `except (JSONDecodeError, Exception)` **nuốt cả `ResourceExhausted`**, retry 3× không backoff, rồi `raise RuntimeError` → 500 | ⚠️ raises-wrong-type |
| `answer_question` | 1 call | ❌ | 429 (embed→`GeminiQuotaError` / generate→handler) | `response.text` `ValueError` block → 500 | ✅ raises-properly |
| `answer_question_stream` | Streaming | ❌ | **❌ Không map được** (status 200 đã commit) | — | ⚠️ partial |

### Bug & missing guard nổi bật

- **`generate_knowledge_graph` (nghiêm trọng nhất về observability)**:
  - `except (json.JSONDecodeError, Exception)` **bắt cả `ResourceExhausted`** → lỗi quota bị che, **retry 3 lần hammer API đang bị rate-limit** (không backoff), cuối cùng `raise RuntimeError(...)` → rơi vào `unhandled_exception_handler` → **500**, không phải 429. User mất hẳn tín hiệu quota.
  - `(json.JSONDecodeError, Exception)` là **thừa** (Exception đã bao trùm).
  - `return {}` cuối hàm là **dead code** (loop luôn return hoặc raise).
- **`extract_keywords` / `score_relevance` / `generate_time_plan`**: `json.loads` trên output đã strip fence nhưng **không try/except** → model trả prose/thiếu key → 500 "Internal server error". `score_relevance` thêm `KeyError` và `float()` `ValueError`. **Không validate cấu trúc** output.
- **`answer_question_stream` (stream gap)**: generator chạy *sau khi* `StreamingResponse` đã commit HTTP 200 → exception handler **không bao giờ chạy**. Lỗi quota giữa stream → **stream gãy âm thầm, không có `[DONE]`, không frame lỗi**. Tệ hơn: `finally` gọi `qa_repo.create(...)` lưu **câu trả lời dở dang như thể hoàn chỉnh**; nếu lỗi ngay token đầu thì lưu rỗng nhưng client vẫn nhận 200 trống.
- **`response.text` (tất cả function generation)**: ném `ValueError` khi candidate bị safety-block / rỗng (`finish_reason != STOP`) → uncaught → **500**. Chưa function nào guard việc này.
- **`_is_quota_error` mong manh**: phụ thuộc match chuỗi `'429'/'quota'/...` vì langchain bọc lại exception. Đổi text lỗi phía Google → tụt nhầm thành 502.

### Tính nhất quán của `GeminiQuotaError` / `GeminiServiceError`

**KHÔNG nhất quán.** Mapping tường minh **chỉ tồn tại ở path embedding** (`_embed_in_executor`). Toàn bộ path generation **không có try/except** trong `gemini_service` → để `ResourceExhausted` propagate thô → **cứu vớt bởi handler toàn cục** `app.add_exception_handler(ResourceExhausted, ...)` trong `main.py` → 429. Hệ quả:

- ✅ Embedding 429 → 429 (qua `GeminiQuotaError`).
- ✅ Generation 429 (trừ KG/stream) → 429 (qua handler `ResourceExhausted` toàn cục).
- ❌ **KG 429 → 500** (bị `RuntimeError` che).
- ❌ **Stream 429 → 200 cụt** (status đã commit).

`main.py` đăng ký đúng 4 handler: `GeminiQuotaError→429`, `GeminiServiceError→502`, `ResourceExhausted→429`, `Exception→500`. Vấn đề không nằm ở đăng ký handler mà ở **chỗ lỗi bị nuốt/đổi loại trước khi tới handler**.

---

## Part 3 — Risk Management Summary

| Risk | Likelihood | Impact | Mitigation hiện tại | Recommended action |
|---|---|---|---|---|
| **Generation RPM vỡ trong `generate_summary`** (burst N+1 call không throttle) | **H** | **H** | Không có (summary không throttle, không retry) | **Ưu tiên #1**: viết lại summary theo map-reduce có batch + delay + backoff; hoặc giảm số chunk cho summary (gộp chunk to hơn / map theo nhóm). |
| Free-tier RPD cạn giữa session | M | M | Không đếm/không cảnh báo | Backoff #2 + thông điệp UI rõ; (tuỳ chọn) đếm request/key trong phiên để cảnh báo sớm. |
| 429 trên generation call (no retry) | **H** | M | Handler toàn cục map 429 nhưng **không retry** | Backoff + jitter #2 bọc *mọi* generate call; đọc `Retry-After` #1. |
| **JSON parse fail** (keywords/relevance/time-plan) → 500 mờ | **H** | M | Không có try/except | Bọc parse, validate schema, retry 1 lần có "JSON-only" reminder, fail → 422/502 message rõ; cân nhắc `response_mime_type=application/json` như KG. |
| **KG nuốt lỗi quota → 500** | M | M | (chính là bug) | Sửa `except` để **re-raise** `ResourceExhausted`/`GeminiQuotaError`, chỉ retry trên `JSONDecodeError`, thêm backoff. |
| Embed timeout doc dài (forced-sleep 100–170s) → 504 | **H** | **H** | Throttle (chính là nguyên nhân latency) | **Async job + SSE progress** (#5, TODO.md): trả `202 + job_id`, chạy nền. |
| Stream Q&A lỗi giữa chừng → 200 cụt + lưu answer dở | M | M | `finally` lưu partial (sai) | Gửi frame `data: {"error": ...}` trước khi đóng; **chỉ lưu khi nhận đủ** (không lưu khi stream gãy). |
| `response.text` `ValueError` (safety block) → 500 | M | M | Không có | Kiểm tra `finish_reason`/candidate trước khi đọc `.text`; trả message thân thiện. |
| Payload `extracted_text` không giới hạn | M | M | Chỉ strip `\x00` | Thêm trần độ dài (vd word/char cap) ở schema + middleware; cảnh báo FE trước khi upload. |
| Concurrent users không có điều phối rate-limit chung | **L** | L | Không có | **Thường KHÔNG phải vấn đề**: BYOK → mỗi user một key, quota độc lập per-project-của-user. Chỉ thành vấn đề nếu nhiều user share *cùng* một key. |

> **Về "concurrent users"**: với mô hình BYOK, rate limit của Gemini áp **theo key/project của từng user**, nên không cần điều phối toàn cục phía server. Điều cần điều phối là **trong phạm vi một key** (nhiều request của cùng user/cùng tài liệu) — đó là việc của token-bucket per-key (#4), không phải global limiter.

---

## Khuyến Nghị

Triển khai theo **3 giai đoạn**, kết hợp **#2 + #1 trước**, rồi **#5 (bản nhẹ)**, rồi **#4**, để **#6 sau cùng**.

**GIAI ĐOẠN 1 — làm ngay (risk thấp, không thêm dep/hạ tầng).** Đây là 80% giá trị với 20% công sức.
1. **Sửa `generate_summary`** (gốc rễ 429): không gọi N+1 call tuần tự thô. Tối thiểu: bọc loop bằng backoff + delay như embed; tốt hơn: gộp chunk cho summary to hơn (giảm N), hoặc map-reduce theo nhóm chunk để cắt mạnh số call.
2. **#2 Exponential backoff + jitter** qua một wrapper retry chung cho mọi call Gemini (tái dùng `_is_quota_error` để chỉ retry khi đúng 429), lấy **#1 `Retry-After`** làm cận dưới. Bắt buộc đặt `max_retries` + tổng timeout để **không phá NFR** (Q&A <10s, summary <60s).
3. **Sửa `generate_knowledge_graph`**: re-raise lỗi quota thay vì nuốt; chỉ retry trên `JSONDecodeError`; bỏ `return {}` dead code.
4. **Bọc JSON parse** ở keywords/relevance/time-plan + validate; guard `response.text` ValueError.

**GIAI ĐOẠN 2 — diệt 504 cho doc dài (theo TODO.md).** Dùng **FastAPI BackgroundTasks + SSE progress** trước (`202 + job_id`, stream `{stage, progress, total}`), **chưa kéo Redis/ARQ**. **BYOK: tuyệt đối không đưa Gemini key vào storage bền** — giữ in-memory trong vòng đời job. Nâng lên ARQ+Redis chỉ khi cần retry bền qua restart + giới hạn concurrency đa worker.

**GIAI ĐOẠN 3 — phòng ngừa chủ động khi scale.** **#4 token-bucket per-key** in-memory để làm phẳng burst, cho phép gỡ delay tĩnh cứng trong `_compute_batch_params`. Docker đa worker → cân nhắc Redis cho bucket chính xác.

**Không ưu tiên**: #3 (phần lớn thuộc FE, bị #4 thay thế). #6 embedding cache (hit-rate thực thấp, cần migration; chỉ đáng làm khi có tính năng re-process/versioning).

**Điều kiện tiên quyết**: User tự xác nhận hạn mức chính xác của key tại [AI Studio rate-limit dashboard](https://aistudio.google.com/rate-limit) trước khi tin vào con số free-tier.

---

## Part 1.D — Giới hạn Free-Tier (ước lượng bảo thủ — cần xác minh per-key)

> ⚠️ Google **không còn công bố số chính xác** trong docs. Trang chính thức [ai.google.dev/gemini-api/docs/rate-limits](https://ai.google.dev/gemini-api/docs/rate-limits) nói limit "depend on a variety of factors ... can be viewed in Google AI Studio". Trong 6–7/12/2025 Google **cắt free-tier ~50–80%** ít thông báo, gây 429 hàng loạt. Số dưới đây triangulate từ docs lịch sử + guide thứ cấp (SEO blogs — thận trọng) + báo cáo 429 của dev. Limit áp **per project**, reset RPD lúc nửa đêm Pacific.

| Model | RPM (planning floor) | TPM | RPD (planning floor) | Confidence |
|---|---|---|---|---|
| `gemini-2.0-flash` (generation) | **~5** (lịch sử 15) | ~250K (lịch sử 1M) | **~200** (lịch sử 1.500) | medium |
| `gemini-embedding-001` (embedding) | **~5–10** (lịch sử 100) | ~30K (không công bố) | **~100** (lịch sử 1.000) | low |

**Hệ quả thiết kế**: lập kế hoạch theo *sàn bảo thủ* ở trên + backoff bắt buộc trên 429 + để user xác nhận số thật cho key của họ.

---

## Action Items

**Ưu tiên P0 (Giai đoạn 1):**
- `[Backend Worker]` Viết lại `generate_summary`: giảm số generation call (gộp chunk lớn hơn / map-reduce theo nhóm) + thêm throttle/backoff. **Đây là gốc 429 chính.**
- `[Backend Worker]` Thêm wrapper **retry exponential backoff + jitter** dùng chung cho mọi call Gemini; đọc `Retry-After`/`retry_delay`; đặt `max_retries` + timeout tôn trọng NFR. (Cân nhắc thêm dep `tenacity` hoặc tự viết.)
- `[Backend Worker]` Sửa `generate_knowledge_graph`: chỉ `except json.JSONDecodeError` (re-raise quota), thêm backoff, bỏ `return {}`.
- `[Backend Worker]` Bọc `json.loads` + validate output ở `extract_keywords` / `score_relevance` / `generate_time_plan`; guard `response.text` `ValueError` (kiểm `finish_reason`) ở tất cả function generation. Trả 422/502 message rõ thay vì 500 mờ.
- `[Backend Worker]` Cân nhắc dùng `response_mime_type="application/json"` cho keywords/relevance/time-plan (như KG đã làm) để giảm JSON parse fail.

**Ưu tiên P1 (Giai đoạn 2 — align TODO.md):**
- `[Backend Worker]` Đổi `POST /api/documents` sang async pattern: `202 + job_id`, embedding chạy BackgroundTasks; `GET /api/upload/{job_id}/progress` SSE `{stage, progress, total}`. **Giữ Gemini key in-memory, không vào storage bền.**
- `[Frontend Worker]` Kết nối SSE progress upload, hiển thị progress bar realtime; xử lý frame `error` trong stream Q&A (hiện stream gãy âm thầm).
- `[Backend Worker]` Stream Q&A: gửi frame `data: {"error": ...}` khi lỗi; **chỉ `qa_repo.create` khi nhận đủ** (không lưu answer dở).
- `[Backend Worker]` / `[Frontend Worker]` Thêm trần độ dài `extracted_text` (schema + cảnh báo FE trước upload).

**Ưu tiên P2 (Giai đoạn 3 / khi scale):**
- `[Backend Worker]` Token-bucket rate limiter **per API key** (in-memory); gỡ delay tĩnh trong `_compute_batch_params` khi bucket điều tiết động.
- `[DevOps Worker]` Khi Docker đa worker: cấu hình Redis cho token-bucket + (nếu nâng) ARQ queue. Cập nhật `docker-compose.yml` + `.env.example`.

**Ưu tiên P3 (tối ưu chi phí, tuỳ chọn):**
- `[DB Worker]` (nếu làm #6) Migration thêm cột `content_hash` + key `(hash, model, dim)` cho embedding cache; lưu ý privacy (scope per-user) và `CHUNK_OVERLAP` làm lệch hash.
- `[Backend Worker]` Logic cache lookup theo `hash(chunk_text)` trước khi gọi embed.

**Cross-cutting:**
- `[Backend Worker]` Củng cố `_is_quota_error` (đang phụ thuộc match chuỗi do langchain bọc `GoogleGenerativeAIError`) — kiểm `__cause__.__cause__` hoặc bắt `GoogleGenerativeAIError` + inspect sâu hơn.
- `[All]` User xác nhận hạn mức key tại AI Studio trước khi tin con số free-tier trong báo cáo này.
