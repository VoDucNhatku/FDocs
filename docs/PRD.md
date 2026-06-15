# FDocs — Product Requirements Document

> **Trạng thái**: Draft v1 — chờ duyệt  
> **Cập nhật lần cuối**: 2026-06-15  
> **Product Manager**: AI Agent

---

## Goal

Xây dựng web application hỗ trợ sinh viên đọc, hiểu và lĩnh hội tri thức từ tài liệu học thuật dài và phức tạp (sách, bài báo, giáo trình) một cách hiệu quả và có hệ thống — thông qua AI chạy hoàn toàn trên trình duyệt (WebLLM).

---

## Target Users

**Sinh viên đại học/sau đại học** cần xử lý lượng lớn tài liệu học thuật trong thời gian có hạn.

**Pain points cụ thể:**
- Không biết tài liệu có phù hợp với nhu cầu trước khi đọc toàn bộ
- Mất nhiều thời gian đọc tài liệu dài mà không có kế hoạch rõ ràng
- Khó nắm bắt mối liên hệ giữa các khái niệm trong tài liệu phức tạp

---

## Core Features (P0)

### 1. Upload & Parse Tài Liệu
- Người dùng upload file PDF hoặc DOCX
- Hệ thống extract text và chunking để phục vụ inference
- Hiển thị preview nội dung sau khi parse thành công

### 2. Read Mode — Đọc Thông Minh
| Tính năng | Mô tả |
|---|---|
| **Tóm tắt** | AI tạo summary toàn bộ tài liệu, có thể theo từng chương/phần |
| **Keywords** | Trích xuất danh sách từ khóa và khái niệm chính |
| **Relevance Score** | Đánh giá mức độ phù hợp với nhu cầu người dùng nhập vào |
| **Related Docs** | Gợi ý tài liệu liên quan từ library cá nhân đã upload |
| **Time Plan** | Lên kế hoạch đọc dựa trên lịch người dùng nhập |

### 3. Understand Mode — Hiểu Sâu
| Tính năng | Mô tả |
|---|---|
| **Knowledge Graph** | Tạo đồ thị khái niệm từ nội dung tài liệu, render interactive |
| **Q&A (RAG)** | Người dùng đặt câu hỏi, AI trả lời dựa hoàn toàn trên context tài liệu |

### 4. Auth & Library
- Đăng ký / Đăng nhập tài khoản
- Mỗi user có library riêng gồm các tài liệu đã upload
- Lưu lịch sử tóm tắt, KG, Q&A theo từng tài liệu

---

## Out of Scope (v1)

- Kết nối external knowledge base (Wikipedia, Semantic Scholar, v.v.)
- Real-time collaboration nhiều người trên cùng tài liệu
- Mobile app (chỉ web)
- Xuất file (export PDF/DOCX kết quả)
- Tích hợp calendar app (Google Calendar, Outlook) — time plan nhập thủ công

---

## Tech Stack

| Layer | Công nghệ | Ghi chú |
|---|---|---|
| **Frontend** | React + Vite | TBD: framework cụ thể |
| **LLM Inference** | WebLLM (in-browser) | Chạy model nhỏ trực tiếp trên browser |
| **RAG / Chunking** | Client-side (JS) | Vector search đơn giản, không cần server |
| **KG Visualization** | D3.js hoặc Cytoscape.js | TBD |
| **Backend** | Node.js + Express hoặc Python FastAPI | Chỉ xử lý auth + file storage |
| **Database** | PostgreSQL hoặc SQLite | TBD dựa vào scale |
| **File Storage** | Local disk hoặc S3-compatible | TBD |
| **Auth** | JWT (access token 15 phút, refresh token httpOnly cookie) | |

---

## Architecture Overview

```
[Browser]
  ├── WebLLM (inference engine)
  ├── RAG pipeline (chunking + vector search)
  ├── KG renderer (D3/Cytoscape)
  └── React UI

[Backend Server]
  ├── Auth API (JWT)
  ├── File upload/storage API
  └── User library API

[Database]
  ├── Users
  ├── Documents (metadata)
  └── Sessions / History
```

---

## Technical Risks & Proposed Solutions

### Risk 1: Context Window Giới Hạn (WebLLM + Tài Liệu Dài)

**Vấn đề**: Model nhỏ chạy trên browser có context window ~4K–8K tokens, trong khi tài liệu học thuật có thể dài hàng trăm trang.

**Giải pháp đề xuất:**

| # | Phương án | Ưu | Nhược |
|---|---|---|---|
| A | **RAG cơ bản**: Chunk text thành đoạn ~512 token, dùng TF-IDF hoặc BM25 để retrieve top-k chunk liên quan nhất trước khi truyền vào model | Đơn giản, không cần model embedding | Recall thấp hơn semantic search |
| B | **Semantic RAG**: Dùng embedding model nhỏ (ví dụ: `all-MiniLM-L6-v2` chạy qua ONNX/WebLLM) để tạo vector, cosine similarity search | Chất lượng retrieve cao hơn | Phức tạp hơn, cần 2 model |
| C | **Hierarchical Summary**: Chunk → summarize từng chunk → summary of summaries → truyền vào final prompt | Giảm nhiễu, phù hợp tóm tắt toàn bộ | Latency cao, nhiều lần gọi model |

**Khuyến nghị**: Dùng **B (Semantic RAG)** cho Q&A, **C (Hierarchical)** cho tóm tắt toàn bộ.

---

### Risk 2: KG Generation — Structured Output Không Ổn Định

**Vấn đề**: Model nhỏ dễ sinh output không đúng format JSON khi yêu cầu structured output (nodes, edges).

**Giải pháp đề xuất:**

| # | Phương án | Ưu | Nhược |
|---|---|---|---|
| A | **JSON Mode + Retry**: Prompt yêu cầu JSON, nếu parse lỗi thì retry tối đa 3 lần | Đơn giản | Latency cao nếu model hay lỗi |
| B | **Grammar-constrained decoding**: Dùng WebLLM/llama.cpp hỗ trợ constrain output theo JSON Schema | Output luôn hợp lệ | Phụ thuộc model có hỗ trợ không |
| C | **Tiền xử lý NLP truyền thống**: Dùng thư viện NLP (compromise.js) để extract entities + relations, chỉ dùng LLM để enrich/classify | Ổn định, không phụ thuộc LLM structured output | KG chất lượng thấp hơn |

**Khuyến nghị**: **B** nếu model WebLLM chọn hỗ trợ grammar-constrained; fallback sang **A** nếu không.

---

### Risk 3: PDF/DOCX Parsing — Browser vs Server

**Vấn đề**: Chưa xác định nên parse file ở đâu.

**Giải pháp đề xuất:**

| # | Phương án | Ưu | Nhược |
|---|---|---|---|
| A | **Parse ở Browser** (pdf.js + mammoth.js) | Không cần upload file lên server, bảo mật tốt hơn, giảm tải backend | Giới hạn bởi RAM/CPU client; file lớn có thể treo browser |
| B | **Parse ở Server** (PyMuPDF / python-docx) | Xử lý được file phức tạp, nhiều cột, table, hình ảnh | Cần upload file lên server → latency + privacy concern |
| C | **Hybrid**: Parse cơ bản ở browser (text only), nếu fail thì fallback lên server | Linh hoạt | Logic phức tạp hơn |

**Khuyến nghị**: **A (Browser)** với pdf.js + mammoth.js — phù hợp scope sinh viên, không cần server mạnh. Nếu file quá phức tạp thì log lỗi và yêu cầu user upload lại.

---

### Risk 4: Time Plan — Phương Thức Nhập Lịch

**Vấn đề**: Chưa xác định cách người dùng nhập lịch rảnh để AI lên time plan.

**Giải pháp đề xuất:**

| # | Phương án | Ưu | Nhược |
|---|---|---|---|
| A | **Form đơn giản**: Nhập ngày bắt đầu, ngày deadline, số giờ/ngày có thể đọc | Dễ implement, dễ dùng | Không linh hoạt theo từng ngày |
| B | **Weekly schedule grid**: UI dạng bảng 7 ngày × 24 giờ, user kéo chọn khung giờ rảnh | Trực quan, chi tiết | Phức tạp UI, có thể overwhelm |
| C | **Natural language**: Người dùng nhập text tự do ("tôi rảnh buổi tối từ 20h-22h, trừ thứ 6") → AI parse | UX tự nhiên nhất | Cần thêm NLP parsing step, dễ sai |

**Khuyến nghị**: **A** cho v1 — nhanh, dễ dùng, đủ dùng. Có thể nâng cấp lên **B** ở v2.

---

## Open Questions

1. WebLLM sẽ dùng model cụ thể nào? (ảnh hưởng đến context window, grammar-constrained support)
2. Backend storage: file PDF/DOCX có được lưu vĩnh viễn trên server hay chỉ lưu metadata sau khi parse?
3. "Relevance Score" — người dùng nhập nhu cầu bằng cách nào? (text tự do, chọn từ tag có sẵn, hay câu hỏi?)

---

## Non-Functional Requirements

- Thời gian parse + inference không quá 30 giây cho tài liệu 20 trang
- Hoạt động trên Chrome/Firefox phiên bản mới nhất (WebGPU support)
- Responsive desktop-first (không cần mobile)
- Không lưu file gốc trên server nếu chọn parse-at-browser
