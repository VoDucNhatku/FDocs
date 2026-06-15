# FDocs — Design Log

> Cập nhật: 2026-06-16

---

## Confirmed Decisions

| # | Quyết định | Giá trị |
|---|---|---|
| 1 | UI Library | Tailwind CSS + shadcn/ui |
| 2 | Font (UI chrome) | Inter |
| 3 | Font (document content) | Merriweather |
| 4 | Theme system | CSS variables + `data-theme` attribute |
| 5 | Theme storage | localStorage |

## Theme Palette

### neutral (default)
```
--bg-base:      #F8FAFC   (slate-50)
--bg-surface:   #FFFFFF
--bg-muted:     #F1F5F9   (slate-100)
--border:       #E2E8F0   (slate-200)
--text-primary: #0F172A   (slate-900)
--text-muted:   #64748B   (slate-500)
--accent:       #4F46E5   (indigo-600)
--accent-hover: #4338CA   (indigo-700)
```

### cream (sepia / long reading)
```
--bg-base:      #FDFBF7
--bg-surface:   #FAF7F2
--bg-muted:     #F0EAE0
--border:       #E0D5C5
--text-primary: #3F3426
--text-muted:   #7C6E5C
--accent:       #B45309   (amber-700)
--accent-hover: #92400E   (amber-800)
```

### dark (scholar / night)
```
--bg-base:      #09090B   (zinc-950)
--bg-surface:   #18181B   (zinc-900)
--bg-muted:     #27272A   (zinc-800)
--border:       #3F3F46   (zinc-700)
--text-primary: #FAFAFA   (zinc-50)
--text-muted:   #A1A1AA   (zinc-400)
--accent:       #818CF8   (indigo-400)
--accent-hover: #6366F1   (indigo-500)
```

---

## Differentiation Features

### ✅ IMPLEMENT NOW (trong quá trình build)

#### #1 — Animated Knowledge Graph Construction
- Khi generate KG, node xuất hiện từng cái với Cytoscape spring layout animation
- Biến thời gian chờ AI thành "visual khám phá tri thức"
- Implementation: `layout: { name: 'cose', animate: true, animationDuration: 1500 }`
- Cytoscape node color sync với active theme (inject JS khi render)

#### #3 — Command Palette (Cmd/Ctrl + K)
- shadcn/ui có `cmdk` sẵn — implement trong AppLayout
- Actions: tóm tắt, hỏi, graph, keywords, switch theme
- Phù hợp với sinh viên power user

#### #5 — SSE Streaming (Q&A typewriter effect)
- FastAPI Server-Sent Events cho Q&A endpoint
- Frontend: `EventSource` API, render chữ từng token
- Loading state: chữ type ra thay vì spinner
- **Cần Backend Worker refactor** `/api/documents/{id}/qa` → SSE stream

---

### [DESIGN PENDING] — Đợi Designer Worker

#### #2 — Library as Similarity Map
- Hiển thị Library dưới dạng mini graph, khoảng cách = embedding similarity
- Cần UX research: thresholds để show/hide edges, interaction model (hover/click)
- Cần backend endpoint mới: `GET /api/library/similarity-map` → all-pairs similarity
- **Không implement v1** — đánh dấu placeholder trong Library page

#### #4 — Reading Heatmap Overlay
- Highlight extracted text theo chunk citation frequency từ Q&A history
- Cần UX research: màu scale, density thresholds, interaction (hover chunk → show citations)
- Logic: map `chunk_id` từ `qa_history.sources` → vị trí text trong `extracted_text`
- **Không implement v1** — đánh dấu placeholder trong Document page

---

## Loading State Design

| Action | Loading UX |
|---|---|
| Upload + embed | Progress bar (chunking → embedding) |
| Summarize | Skeleton text đang "nén lại" |
| Keywords | Pulse animation trên tag placeholders |
| Knowledge Graph | Mini Cytoscape đang vẽ edge (loading preview) |
| Q&A | Typewriter streaming (SSE) |

---

## Open Design Questions (cho Designer Worker)

1. Navigation model: sidebar cố định hay top nav? Tài liệu mở trong tab hay full page?
2. Read Mode vs Understand Mode: hai tab trong cùng trang hay hai route riêng?
3. Extracted text panel: hiển thị bên cạnh tools (split view) hay ẩn/hiện toggle?
4. Mobile behavior (375px): priority features nào hiển thị trên mobile?
