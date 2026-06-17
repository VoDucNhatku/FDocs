# Prompt Engineering Spec — FDocs

> **Ngày**: 2026-06-17 | **Worker**: Prompt Engineering Worker  
> **Model**: `gemini-2.5-flash` (thinking model, implicit caching, Vietnamese strong support)  
> **Decision upstream**: Per-Feature system instructions (Option B) — xem `RESEARCH_system_prompt_design.md`

---

## Model Context

**Gemini 2.5 Flash** là thinking model — nó reason internally trước khi trả lời. Điều này có nghĩa:
- Prompt không cần "chain-of-thought" explicit — model tự làm
- Instruction following tốt với explicit, step-by-step instructions
- **Cần**: format instructions rõ ràng; "concisely" hay "briefly" mà không có structure cụ thể → model tự chọn và thường chọn sai
- **JSON**: phải có instruction trong system hoặc user-turn — model KHÔNG tự sinh JSON nếu không được bảo
- **Vietnamese**: capable tốt, nhưng nếu prompt tiếng Anh mà content tiếng Việt → model có xu hướng trả tiếng Anh. Phải explicit.
- **Implicit caching**: system instruction được cache tự động ở 10% cost (Gemini 2.5+) — không cần lo về chi phí khi system instruction dài hợp lý

---

## Phần 1 — System Instructions

### 1.1 `_SYSTEM_TEXT` — Dùng cho: `generate_summary`, `answer_question`, `answer_question_stream`

```
Bạn là trợ lý học thuật của FDocs — ứng dụng giúp sinh viên đọc tài liệu học thuật.

NGÔN NGỮ: Phát hiện ngôn ngữ chủ đạo từ nội dung tài liệu được cung cấp:
- Tài liệu tiếng Việt → trả lời tiếng Việt
- Tài liệu tiếng Anh → trả lời tiếng Anh
- Tài liệu mixed → ưu tiên tiếng Việt
(Nếu user-turn chỉ định ngôn ngữ khác → ưu tiên theo user-turn)

GROUNDING: Chỉ sử dụng thông tin từ nội dung tài liệu được cung cấp trong prompt. Không bổ sung từ kiến thức bên ngoài. Nếu thông tin không có trong tài liệu → dùng đúng cụm "Tài liệu không đề cập đến điều này."

ĐỊNH DẠNG: Dùng Markdown khi hữu ích:
- ### heading cho chủ đề lớn (trong summary)
- **bold** cho khái niệm quan trọng hoặc trích dẫn chứng cứ
- - bullet list cho điểm liệt kê
Không dùng Markdown cho câu trả lời ngắn (1–2 câu).

PHONG CÁCH: Học thuật, súc tích. Không mở đầu bằng: "Tất nhiên!", "Dưới đây là...", "Tôi rất vui được...", "Chắc chắn rồi!". Không kết thúc bằng: "Hy vọng hữu ích!", "Nếu bạn có câu hỏi...", "Tóm lại,".
```

**Giải thích từng dòng:**
- **Persona**: ngắn, 1 câu — đủ context mà không làm phức tạp
- **NGÔN NGỮ**: 3 case cụ thể + override clause cho Q&A user-turn; "ưu tiên tiếng Việt nếu mixed" phản ánh target user là sinh viên Việt Nam
- **GROUNDING**: positive ("chỉ dùng...") + negative ("không bổ sung...") + fallback phrase cụ thể → model dùng đúng phrase thay vì improvise
- **ĐỊNH DẠNG**: "khi hữu ích" + "Không dùng Markdown cho câu ngắn" → tránh over-formatting trong Q&A
- **Anti-filler**: list phrase cụ thể — model follow tốt hơn danh sách concrete so với "ngắn gọn"

---

### 1.2 `_SYSTEM_JSON` — Dùng cho: `extract_keywords`, `score_relevance`, `generate_time_plan`, `generate_knowledge_graph`

```
Bạn là trợ lý học thuật của FDocs — ứng dụng giúp sinh viên đọc tài liệu học thuật.

OUTPUT: Trả về ĐÚNG định dạng JSON như mô tả trong prompt. Không thêm text, markdown, code fence (```json), hay giải thích nào bên ngoài JSON. JSON minified (không có whitespace thừa).

NGÔN NGỮ: Phát hiện ngôn ngữ chủ đạo từ nội dung tài liệu. Các trường text trong JSON (label, explanation, title, relation, tên phần) phải dùng ngôn ngữ đó. Ưu tiên tiếng Việt nếu mixed.

GROUNDING: Chỉ sử dụng thông tin từ nội dung tài liệu được cung cấp. Không bổ sung từ kiến thức bên ngoài.
```

**Giải thích từng dòng:**
- **OUTPUT**: "không thêm code fence" — `_strip_fences` vẫn giữ trong code làm safeguard, nhưng explicit instruction giảm frequency đáng kể
- **JSON minified**: best practice từ Google documentation — tiết kiệm output token, không ảnh hưởng downstream parsing
- **NGÔN NGỮ**: list cụ thể field names (`label`, `explanation`, `title`, `relation`) → model biết áp dụng ở đâu, không áp dụng cho date/id/score
- **GROUNDING**: ngắn hơn `_SYSTEM_TEXT` — JSON features có hallucination risk thấp hơn text features (structured output constraint)

---

## Phần 2 — User-Turn Prompts

### 2.1 `generate_summary` — Map Step

**Vấn đề hiện tại:**
```
Summarize the following text concisely:

{segment}
```
- "concisely" vague — không có structure guidance → model tự chọn format (thường là 1 paragraph)
- Tiếng Anh → model có xu hướng trả tiếng Anh dù document tiếng Việt
- Sau Phase 10 (markdown render), output vẫn là plain text vì model không biết dùng heading/bullet

**Đề xuất (Map Step):**
```
Tóm tắt đoạn sau của tài liệu học thuật.

Yêu cầu:
- Dùng ### heading cho mỗi chủ đề hoặc luận điểm lớn
- Dùng - bullet list cho các điểm chính dưới mỗi heading
- Giữ nguyên thuật ngữ kỹ thuật và tên riêng từ tài liệu

Nội dung:
{segment}
```

**Giải thích:**
- "Tóm tắt" thay vì "Summarize" → trigger language context sớm (model đã biết từ `_SYSTEM_TEXT`, nhưng user-turn bằng tiếng Việt reinforces)
- "### heading cho mỗi chủ đề" → định nghĩa rõ khi nào dùng heading (tránh model dùng # hay ## quá to)
- "Giữ nguyên thuật ngữ" → quan trọng với tài liệu học thuật, tránh model paraphrase thuật ngữ chuyên ngành thành từ thông thường

**Risk:** Thấp — thêm format guidance, không đổi logic  
**Test cần verify:** Summary tiếng Việt có heading + bullet khi document tiếng Việt; Summary tiếng Anh khi document tiếng Anh

---

### 2.2 `generate_summary` — Reduce Step

**Vấn đề hiện tại:**
```
Synthesize these partial summaries into one coherent summary:

{combined}
```
- "coherent" vague — model thường concat thay vì thực sự tổng hợp
- Không có deduplication instruction → thông tin trùng lặp giữa các segment vẫn xuất hiện
- Không có structure instruction cho final output

**Đề xuất (Reduce Step):**
```
Tổng hợp các tóm tắt riêng lẻ sau thành một bản tóm tắt duy nhất, mạch lạc.

Yêu cầu:
- Dùng ## heading cho các chủ đề lớn của toàn tài liệu
- Dùng - bullet list cho điểm chính dưới mỗi heading
- Loại bỏ nội dung trùng lặp giữa các phần
- Sắp xếp theo luồng logic của tài liệu, không phải theo thứ tự các tóm tắt đầu vào

Các tóm tắt riêng lẻ:
{combined}
```

**Giải thích:**
- "## heading" (to hơn ###) cho final output — final summary dùng heading cấp cao hơn partial summary
- "Loại bỏ nội dung trùng lặp" — explicit instruction, model 2.5-flash follow tốt với instruction này
- "Sắp xếp theo luồng logic" — quan trọng khi document có introduction → body → conclusion

**Risk:** Thấp  
**Test cần verify:** Final summary có structure, không có đoạn trùng

---

### 2.3 `extract_keywords`

**Vấn đề hiện tại:**
```
Extract the 10-15 most important keywords and concepts from this text. Return ONLY a JSON array of strings, no explanation.

{truncated}
```
- Không có tiêu chí ưu tiên → model chọn keyword ngẫu nhiên, có thể thiên về general words
- Tiếng Anh → keyword có thể là tiếng Anh cho tài liệu tiếng Việt (handled bởi `_SYSTEM_JSON`, nhưng user-turn có thể reinforce)

**Đề xuất:**
```
Trích xuất 10–15 từ khóa và khái niệm quan trọng nhất từ đoạn văn này.

Tiêu chí ưu tiên (theo thứ tự):
1. Thuật ngữ kỹ thuật đặc thù của lĩnh vực học thuật
2. Tên phương pháp, mô hình, hoặc framework được đề cập
3. Khái niệm xuất hiện nhiều lần hoặc được định nghĩa rõ ràng

Trả về JSON array: ["từ khóa 1", "khái niệm 2", ...]

Nội dung:
{truncated}
```

**Giải thích:**
- 3 tiêu chí ưu tiên thứ bậc → model tư duy như expert domain, không như bag-of-words extractor
- Example format `["từ khóa 1", "khái niệm 2", ...]` dùng tiếng Việt làm placeholder → signal ngôn ngữ mong muốn (defense-in-depth với `_SYSTEM_JSON`)
- Bỏ "no explanation" trong user-turn (đã handled bởi `_SYSTEM_JSON`)

**Risk:** Thấp  
**Test cần verify:** Keywords là tiếng Việt cho tài liệu tiếng Việt; keywords specific (không phải "tài liệu", "nghiên cứu")

---

### 2.4 `score_relevance`

**Vấn đề hiện tại:**
```
Evaluate how relevant this document is to the user's need.
User goal: {goal}
Keywords of interest: {keywords}
Topic: {topic}

Document excerpt:
{truncated}

Return ONLY a JSON object: {"score": <float 0-1>, "explanation": "<1-2 sentences>"}
```
- Không có tiêu chí scoring → model subjective, thiếu nhất quán
- "1-2 sentences" quá ngắn — Phase 10 đã thêm markdown render cho explanation, cần output phong phú hơn
- "explanation" không nói rõ giải thích điểm số hay giải thích tài liệu

**Đề xuất:**
```
Đánh giá mức độ phù hợp của tài liệu với nhu cầu của người dùng.

Nhu cầu người dùng:
- Mục tiêu học tập: {goal}
- Từ khóa quan tâm: {keywords_joined}
- Chủ đề: {topic}

Trích đoạn tài liệu:
{truncated}

Thang điểm:
- 0.85–1.0: Trực tiếp phục vụ mục tiêu, bao phủ phần lớn từ khóa
- 0.60–0.84: Liên quan đáng kể, có nội dung hữu ích rõ ràng
- 0.35–0.59: Liên quan gián tiếp, chỉ chạm một phần nhu cầu
- 0.10–0.34: Ít liên quan, thông tin ngoài lề
- 0.00–0.09: Không phù hợp

Trả về JSON: {"score": <float 0.0–1.0, 2 chữ số thập phân>, "explanation": "<2–3 câu: (1) điểm số được cho vì lý do gì, (2) điểm mạnh của tài liệu với nhu cầu này, (3) điểm còn thiếu nếu có. Dùng **bold** cho lý do chính.>"}
```

**Giải thích:**
- Thang điểm với range + mô tả → model cho score nhất quán hơn, tránh cluster ở 0.7–0.8
- Explanation template "3 câu cấu trúc" → model tổ chức thông tin có ích, không phải chỉ paraphrase nhu cầu
- `**bold**` trong description của explanation field → model biết dùng markdown inside JSON string value (hợp lệ JSON)
- "2 chữ số thập phân" → precision hợp lý, tránh 0.7777... hay 1.0

**Risk:** Trung bình — thay đổi format instruction của explanation có thể ảnh hưởng parsing. Cần verify `data["explanation"]` vẫn là string, không có newline ký tự đặc biệt phá JSON.  
**Test cần verify:** JSON valid, explanation ~2-3 câu tiếng Việt với bold, score trong range

---

### 2.5 `generate_time_plan`

**Vấn đề hiện tại:**
```
Create a reading plan for a document.
Word count: {word_count}
Sections: {sections_info}
Start date: {start_date}
Deadline: {deadline}
Available hours per day: {hours_per_day}

Return ONLY a JSON array of objects: [{"date": "YYYY-MM-DD", "sessions": [{"title": "section name", "estimated_minutes": 30}]}]
```
- "section name" → tiếng Anh cho tài liệu tiếng Việt (handled bởi `_SYSTEM_JSON`)
- Không có distribution logic → model có thể nhét tất cả vào 1 ngày hoặc tạo session quá ngắn/dài
- Không có constraint về session length

**Đề xuất:**
```
Lập kế hoạch đọc cho tài liệu.

Thông số:
- Số từ: {word_count}
- Cấu trúc tài liệu: {sections_info}
- Ngày bắt đầu: {start_date}
- Deadline: {deadline}
- Số giờ đọc mỗi ngày: {hours_per_day} giờ

Nguyên tắc lập kế hoạch:
- Ưu tiên hoàn thành từng chương/phần trước khi chuyển phần mới (không chia đôi giữa các ngày)
- Mỗi session: 30–90 phút; nếu một phần dài hơn 90 phút thì chia làm 2 session
- Phân bổ đều đặn, để lại 1–2 ngày ôn tập cuối nếu thời gian cho phép
- Nếu không phát hiện cấu trúc chương → chia đều theo word count với tiêu đề "Phần 1", "Phần 2", ...

Trả về JSON array: [{"date": "YYYY-MM-DD", "sessions": [{"title": "tên phần cụ thể", "estimated_minutes": 45}]}]
```

**Giải thích:**
- "Ưu tiên hoàn thành từng chương" — tránh plan chia 1 chapter ra 3 ngày (không thực tế về mặt học thuật)
- "30–90 phút" range hợp lý cho reading session học thuật
- "1–2 ngày ôn tập" — detail quan trọng cho use case học sinh sinh viên
- Fallback "Phần 1, Phần 2" — xử lý case sections_info là null/empty

**Risk:** Thấp — thêm constraint logic, không đổi schema JSON  
**Test cần verify:** Session titles tiếng Việt cho tài liệu tiếng Việt; session length 30–90 phút; ngày không vượt deadline

---

### 2.6 `generate_knowledge_graph`

**Vấn đề hiện tại:**
```
Extract a knowledge graph from this text. Identify key concepts, entities, and processes, and their relationships.

{truncated}
```
- Quá generic → model tạo quá nhiều node (có thể 50+) hoặc quá ít
- Không có giới hạn số node → với tài liệu dài, model có thể overload graph
- "relationships" vague → edge labels thường là noun ("dependency", "usage") thay vì verb ("phụ thuộc vào", "sử dụng")
- Node labels tiếng Anh cho tài liệu tiếng Việt (handled bởi `_SYSTEM_JSON`)

**Đề xuất:**
```
Trích xuất knowledge graph từ đoạn văn học thuật sau.

Quy tắc trích xuất Nodes (tối đa 20):
- Chọn những concept, entity, hoặc process QUAN TRỌNG NHẤT — ưu tiên chất lượng hơn số lượng
- type "concept": khái niệm lý thuyết, định nghĩa, nguyên lý
- type "entity": tên riêng, phương pháp, công cụ, tổ chức
- type "process": quy trình, thuật toán, chuỗi bước
- Loại bỏ node quá chung chung như "nghiên cứu", "tài liệu", "kết quả"

Quy tắc trích xuất Edges:
- Mỗi edge là động từ hoặc cụm động từ ngắn (tối đa 4 từ): "sử dụng", "dẫn đến", "bao gồm", "được định nghĩa bằng", "ảnh hưởng đến"
- Không dùng noun phrase làm edge label ("dependency of", "part of")

Nội dung:
{truncated}
```

**Giải thích:**
- "tối đa 20" nodes — giới hạn hợp lý cho KG có thể render được trong Cytoscape.js mà không quá rối
- Loại bỏ list rõ ràng → model không tạo noise nodes
- "động từ hoặc cụm động từ" cho edge — chuẩn KG cho semantic clarity; "dependency of" là anti-pattern phổ biến
- "tối đa 4 từ" cho edge label — tránh edge thành cả câu

**Risk:** Thấp — schema vẫn giữ nguyên, chỉ guidance thay đổi  
**Test cần verify:** Node labels tiếng Việt; edge labels là verb phrase; số node ≤ 20

---

### 2.7 `answer_question` + `answer_question_stream`

**Vấn đề hiện tại:**
```
Answer the question based ONLY on the provided context. If the answer is not in the context, say so.

Context:
{context}

Question: {question}
```
- "say so" vague → model vẫn có thể partially hallucinate ("While the context doesn't directly say X, we can infer...")
- Không có language instruction → nếu document tiếng Anh, user hỏi tiếng Việt, model có thể trả tiếng Anh
- Không có citation guidance → không dùng tính năng markdown đã render (Phase 10)
- Không có length control → model đôi khi over-generate

> **Lưu ý quan trọng**: Q&A phải reply theo ngôn ngữ CỦA CÂU HỎI, không phải ngôn ngữ tài liệu (sinh viên Việt Nam đọc tài liệu tiếng Anh và hỏi bằng tiếng Việt — cần trả lời tiếng Việt). User-turn instruction này override rule trong `_SYSTEM_TEXT`.

**Đề xuất (dùng cho cả `answer_question` và `answer_question_stream`):**
```
Trả lời câu hỏi dựa CHỈ VÀO ngữ cảnh được cung cấp dưới đây.
Trả lời bằng cùng ngôn ngữ với câu hỏi.

Quy tắc bắt buộc:
- Nếu câu trả lời có thể rút ra từ ngữ cảnh (trực tiếp hoặc bằng cách tổng hợp): trả lời trực tiếp và súc tích. Dùng **bold** để đánh dấu phần chứng cứ quan trọng.
- Câu hỏi tổng quan ('nói về gì?', 'chủ đề là gì?', 'tóm tắt nội dung?'): tổng hợp từ các đoạn ngữ cảnh — đây là grounding hợp lệ, không phải suy đoán ngoài tài liệu.
- Nếu chủ đề câu hỏi THỰC SỰ VẮNG MẶT trong toàn bộ ngữ cảnh (không đề cập bất kỳ đâu): chỉ viết đúng cụm "Tài liệu không đề cập đến điều này." — không thêm suy đoán từ kiến thức bên ngoài.
- Độ dài: tối đa 3–4 đoạn ngắn; nếu câu trả lời đơn giản thì 1–2 câu là đủ.

Ngữ cảnh:
{context}

Câu hỏi: {question}
```

**Giải thích thay đổi so với v1:**
- **Grounding relaxed cho synthesis**: "CÓ trong ngữ cảnh" → "có thể rút ra (trực tiếp hoặc tổng hợp)". Root cause: câu hỏi tổng quan ("Chapter này nói về gì?") trigger fallback vì model không tìm thấy câu explicit, dù chunks chứa đủ nội dung để tổng hợp.
- **Explicit carve-out cho overview questions**: Liệt kê pattern ('nói về gì?', 'chủ đề là gì?') → model biết đây là synthesis task, không phải out-of-scope.
- **Fallback condition được làm rõ**: "THỰC SỰ VẮNG MẶT" + "không đề cập bất kỳ đâu" → tránh false positive trên synthesis questions.

**Test cần verify:**
1. Document tiếng Anh + hỏi tiếng Việt → reply tiếng Việt ✓
2. Document tiếng Việt + hỏi tiếng Anh → reply tiếng Anh ✓
3. Câu hỏi tổng quan ("Chapter này nói về gì?") → tổng hợp nội dung, không phải "Tài liệu không đề cập" ✓
4. Câu hỏi thực sự ngoài tài liệu → chỉ "Tài liệu không đề cập đến điều này." ✓
5. Stream answer: verify không bị cut-off giữa chừng ✓

---

### 2.8 LaTeX support (Phase 16)

**Bối cảnh:** Frontend Phase 13 đã tích hợp KaTeX (`remark-math` + `rehype-katex`). LLM chưa được thông báo → không dùng LaTeX trong output.

**Thay đổi trong `_SYSTEM_TEXT`:**
```
ĐỊNH DẠNG: Dùng Markdown khi hữu ích:
...
Dùng LaTeX khi có ký hiệu toán học hoặc công thức: $...$ cho inline, $$...$$ cho display block. Frontend hỗ trợ KaTeX render.
```

**Giải thích:**
- Đặt LaTeX instruction trong ĐỊNH DẠNG section — consistent với cách Markdown được hướng dẫn
- Explicit mention "Frontend hỗ trợ KaTeX" → model biết đây là render context, không phải plain text
- `$...$` inline và `$$...$$` display — đây là KaTeX-compatible syntax
- Không force LaTeX khi không cần: "khi có ký hiệu toán học hoặc công thức" → model dùng discretion

**Test cần verify:**
1. Câu hỏi về công thức toán học → output có `$...$` hoặc `$$...$$` ✓
2. Câu hỏi plain text → không có LaTeX noise ✓
3. Frontend render đúng (không hiện raw `$...$`) ✓

---

## Phần 3 — Factory Function Interface

> Spec này dành cho Backend Worker implement.

```
_make_client(api_key, system_instruction=_SYSTEM_TEXT)
  Dùng mặc định (_SYSTEM_TEXT) cho: generate_summary, answer_question, answer_question_stream
  Dùng _SYSTEM_JSON cho: extract_keywords, score_relevance, generate_time_plan

_make_json_client(api_key, schema, system_instruction=_SYSTEM_JSON)
  Dùng mặc định (_SYSTEM_JSON) cho: generate_knowledge_graph
```

**Mapping hoàn chỉnh:**

| Function | Factory | System Instruction |
|---|---|---|
| `generate_summary` | `_make_client` | `_SYSTEM_TEXT` (default) |
| `extract_keywords` | `_make_client` | `_SYSTEM_JSON` (explicit) |
| `score_relevance` | `_make_client` | `_SYSTEM_JSON` (explicit) |
| `generate_time_plan` | `_make_client` | `_SYSTEM_JSON` (explicit) |
| `generate_knowledge_graph` | `_make_json_client` | `_SYSTEM_JSON` (default) |
| `answer_question` | `_make_client` | `_SYSTEM_TEXT` (default) |
| `answer_question_stream` | `_make_client` | `_SYSTEM_TEXT` (default) |

---

## Phần 4 — Thứ Tự Implement & Risk Summary

| # | Task | Risk | Test |
|---|---|---|---|
| 1 | `_SYSTEM_TEXT` + `_SYSTEM_JSON` constants | Thấp | pytest 113 tests |
| 2 | Factory function optional param | Thấp | pytest |
| 3 | `extract_keywords`, `score_relevance`, `generate_time_plan` → `_SYSTEM_JSON` | Thấp | pytest + manual keywords/relevance |
| 4 | Summary map + reduce prompts | Thấp | Manual: upload doc tiếng Việt → verify heading/bullet |
| 5 | Knowledge graph prompt | Thấp | Manual: KG labels tiếng Việt, edge là verb |
| 6 | Relevance scoring prompt (thang điểm + explanation) | Trung bình | Manual: score trong range, explanation 2-3 câu |
| 7 | Q&A prompt (cả 2 functions) | Trung bình | Manual: 5 test cases ở trên |

> **Không implement #6 và #7 trong cùng một commit** — tách ra để dễ rollback nếu cần.

---

## Sources

- [Gemini 2.5 Flash Model Card](https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-2-5-Flash-Model-Card.pdf)
- [Prompt design strategies | Gemini API](https://ai.google.dev/gemini-api/docs/prompting-strategies)
- [Structured output | Gemini API](https://ai.google.dev/gemini-api/docs/structured-output)
- [Caching | Gemini API](https://ai.google.dev/api/caching)
- [LLM Grounding | k2view](https://www.k2view.com/blog/llm-grounding/)
- [Smarter Prompts in RAG | Medium](https://medium.com/@ai.nishikant/smarter-prompts-engineering-better-instructions-in-rag-58e87ad8077f)
