# FDocs — Progress Tracker

> Cập nhật lần cuối: 2026-06-15

---

## Phase 0 — Product Planning ✅ DONE

**Output artifacts:**
- `docs/PRD.md` v1.3 — APPROVED, sẵn sàng chuyển giao
- `docs/PROGRESS.md` (file này)

**Decisions chốt (v1.3):**
- Chunks: bảng `chunks` riêng với `embedding vector(768)`
- KG: JSONB blob trong `analysis_results.kg`
- Time Plan: regex heading detection + word count fallback
- Auth: không cần email verification ở v1

---

## Phase 1 — Database Schema ✅ DONE

**Worker**: Database Worker (`/as-db`)

**Tasks:**
- [x] Thiết kế ERD đầy đủ (Mermaid)
- [x] Viết SQL migration file (plain SQL)
- [x] Enable pgvector + pgcrypto extension
- [x] HNSW index trên `chunks.embedding` (cosine, m=16, ef_construction=64)
- [x] Auto-update trigger cho `updated_at`

**Output artifacts:**
- `docs/schema.md` — ERD + chi tiết từng bảng + index table
- `backend/migrations/0001_initial_schema.sql` — migration file đầy đủ

---

## Phase 2 — Backend API ✅ DONE

**Worker**: Backend Worker (`/as-backend`)

**Tasks:**
- [x] Cấu trúc FastAPI theo layer (routes / services / repositories / middlewares)
- [x] Auth: register, login, refresh, logout (JWT + httpOnly cookie)
- [x] Documents CRUD
- [x] Analysis: summary, keywords, relevance, time-plan, knowledge-graph, related-docs
- [x] Q&A RAG endpoint + lịch sử
- [x] Gemini service (chunk, embed, generate, KG structured output)
- [x] Error handler middleware + CORS config

**Output artifacts:**
- `backend/app/` — toàn bộ source code FastAPI
- `backend/requirements.txt`
- `backend/.env.example`
- `docs/API.md` — API reference đầy đủ

---

## Phase 3 — Frontend ✅ DONE

**Worker**: Frontend Worker (`/as-frontend`)

**Tasks:**
- [x] Vite + React project init
- [x] Tailwind CSS + CSS variable 3-theme system (neutral / cream / dark)
- [x] ThemeProvider, AuthContext, GeminiKeyContext
- [x] API service layer với JWT auto-attach + Gemini Key header + auto-refresh
- [x] Auth pages: Login, Register, API Key Setup
- [x] AppLayout (sidebar + command palette ⌘K) + AuthLayout
- [x] Library page (grid view)
- [x] Upload page (drag-drop, pdf.js + mammoth.js, progress bar)
- [x] Document page: Read Mode (Summary, Keywords, Relevance, TimePlan, RelatedDocs)
- [x] Document page: Understand Mode (KnowledgeGraph Cytoscape + spring animation, Q&A streaming)
- [x] Command Palette ⌘K (cmdk)
- [x] Build verified: ✓ 2172 modules, no errors

**Output artifacts:**
- `frontend/` — toàn bộ React source code
- `docs/DESIGN_LOG.md` — design decisions + differentiation features log

**[DESIGN PENDING] items:**
- Library Similarity Map (#2) — đợi Designer Worker + backend endpoint mới
- Reading Heatmap (#4) — đợi Designer Worker

---

## Phase 4 — Testing ⏳ PENDING

**Worker**: Tester (`/as-tester`)  
**Chờ**: Phase 2 + 3 hoàn thành

---

## Phase 5 — DevOps / Deploy ⏳ PENDING

**Worker**: DevOps (`/as-devops`)  
**Chờ**: Phase 4 pass
