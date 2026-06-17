# Knowledge Graph Enhanced Interactivity — Design Spec

> **Trạng thái**: DESIGN COMPLETE — Sẵn sàng để Frontend Worker implement  
> **Phiên bản**: v1.0  
> **Cập nhật**: 2026-06-17 — Designer Worker  
> **Component target**: `frontend/src/features/document/understand-mode/KnowledgeGraphPanel.jsx`

---

## Tổng quan kiến trúc component

```
KnowledgeGraphPanel
├── Header row
│   ├── Title + stats (nodes · edges)
│   └── Action buttons: [Table view] [Fit] [Tạo lại / Tạo graph]
├── Canvas wrapper (relative, flex-1)
│   ├── Cytoscape container (ref={containerRef})
│   ├── Legend (absolute, bottom-right)
│   └── Tooltip (absolute, DOM-based, z-50)
└── Accessibility Table (conditional render, replaces canvas)
    ├── Tab bar: [Nodes] [Edges]
    └── Table content
```

Tooltip và Legend là **DOM elements** (không phải Cytoscape labels), đặt bên trong cùng `relative` wrapper với Cytoscape container.

---

## 1. Hover Tooltip

### Trigger & Dismiss

- **Trigger**: `cy.on('mouseover', 'node', handler)` — Cytoscape mouse event
- **Dismiss**: `cy.on('mouseout', 'node', handler)` + `cy.on('mousedown', handler)` (click bất kỳ đâu dismiss ngay)
- **Delay trước khi hiện**: 120ms (dùng `setTimeout` trong handler, clear on `mouseout`)
- **Không hiện** khi: đang pan graph (track `isPanning` state), mobile (< 640px)

### Position (DOM-based)

```js
// Lấy position từ Cytoscape → convert sang DOM coordinates
const renderedPos = node.renderedPosition()
const containerRect = containerRef.current.getBoundingClientRect()

// Tooltip top-left corner mặc định = node center + offset
let x = renderedPos.x + 12   // 12px sang phải node
let y = renderedPos.y - 60   // 60px lên trên node (hiện phía trên)
```

**Flip logic (edge case — tooltip gần rìa canvas):**

```
Canvas width = containerRef.current.offsetWidth
Canvas height = containerRef.current.offsetHeight
Tooltip width = 220px (fixed)
Tooltip height = ~96px (estimate)

Nếu (x + 220) > Canvas width   → x = renderedPos.x - 220 - 12   // flip sang trái
Nếu (y - 96) < 0               → y = renderedPos.y + 20          // flip xuống dưới node
```

Tooltip dùng `position: absolute` trong container wrapper (không phải `fixed`) → `x, y` là relative to container.

### Content

```
┌─────────────────────────────┐
│ [●] CONCEPT                 │  ← type badge (uppercase, 10px, medium)
│ Gradient Descent            │  ← node label (14px, semibold)
│ 6 connections               │  ← degree count (12px, muted)
└─────────────────────────────┘
```

**Fields:**
| Field | Source | Format |
|---|---|---|
| Type badge | `node.data('type')` | `CONCEPT` / `ENTITY` / `PROCESS` — uppercase |
| Type dot color | `NODE_TYPE_COLORS[type]` | dot 8px, màu tương ứng (xem Legend) |
| Label | `node.data('label')` | truncate 40 chars nếu dài hơn |
| Connections | `node.degree()` | `{n} connection` / `{n} connections` (pluralize) |

### Style

```css
.kg-tooltip {
  position: absolute;
  z-index: 50;
  pointer-events: none;                     /* không block mouse event canvas */

  width: 220px;
  padding: 10px 12px;
  border-radius: 8px;

  background: var(--bg-surface);
  border: 1px solid var(--border);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.10), 0 1px 4px rgba(0, 0, 0, 0.06);

  /* dark theme — shadow đậm hơn */
  /* [data-theme="dark"] .kg-tooltip: box-shadow: 0 4px 16px rgba(0,0,0,0.4) */
}

.kg-tooltip-type-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}

.kg-tooltip-type-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.kg-tooltip-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.3;
  margin-bottom: 4px;
  word-break: break-word;
}

.kg-tooltip-meta {
  font-size: 12px;
  color: var(--text-muted);
}
```

### Animation

```css
.kg-tooltip {
  opacity: 0;
  transform: translateY(4px);
  transition:
    opacity 120ms ease-out,
    transform 120ms ease-out;
}

.kg-tooltip.is-visible {
  opacity: 1;
  transform: translateY(0);
}
```

**Cách dùng trong React**: toggle class `is-visible` thay vì conditional render để animation out hoạt động. Hoặc dùng state `{ visible, x, y, nodeData }` — khi `visible=false` thêm inline `opacity: 0; pointer-events: none`.

**prefers-reduced-motion**: transition-duration → 0.01ms (đã có global rule trong `index.css`).

---

## 2. Click Node Highlight (Ego Network)

### Behavior States

| Action | Result |
|---|---|
| Click một node | Node đó = "selected"; connected edges + neighbor nodes highlight; tất cả phần còn lại dim |
| Click lần 2 vào cùng node | Deselect — reset toàn bộ về default |
| Click vào empty space | Reset về default |
| Click vào node khác | Chuyển selection sang node mới (không cần click 2 lần) |

### Cytoscape Style Selectors

Thêm các selectors sau vào mảng `style` trong `cytoscape({...})`. Các selectors này dùng **Cytoscape class system** (`addClass`/`removeClass`).

```js
// Selectors cần thêm vào style array:

{
  selector: 'node.dimmed',
  style: {
    'opacity': 0.15,
    'transition-property': 'opacity',
    'transition-duration': '200ms',
    'transition-timing-function': 'ease-out',
  },
},
{
  selector: 'edge.dimmed',
  style: {
    'opacity': 0.08,
    'transition-property': 'opacity',
    'transition-duration': '200ms',
    'transition-timing-function': 'ease-out',
  },
},
{
  selector: 'node.highlighted',
  style: {
    'border-width': 2.5,
    'border-color': (el) => NODE_TYPE_COLORS[el.data('type')] ?? colors.node,
    'border-opacity': 1,
    'opacity': 1,
    'transition-property': 'opacity, border-width',
    'transition-duration': '200ms',
    'transition-timing-function': 'ease-out',
  },
},
{
  selector: 'node.selected',
  style: {
    'border-width': 3,
    'border-color': (el) => NODE_TYPE_COLORS[el.data('type')] ?? colors.node,
    'border-opacity': 1,
    'background-color': (el) => NODE_TYPE_COLORS[el.data('type')] ?? colors.node,
    'opacity': 1,
    'box-shadow': '0 0 0 4px rgba(79,70,229,0.25)',  // dùng accent với alpha — glow effect
  },
},
{
  selector: 'edge.highlighted',
  style: {
    'width': 2.5,
    'opacity': 1,
    'line-color': colors.node,                // accent color — không phải edge muted
    'target-arrow-color': colors.node,
    'font-size': 11,                           // edge label lớn hơn khi highlight
    'transition-property': 'opacity, width',
    'transition-duration': '200ms',
    'transition-timing-function': 'ease-out',
  },
},
```

### Event Handler Logic

```js
// Track selected node trong ref (không dùng state để tránh re-render)
const selectedNodeRef = useRef(null)

cy.on('tap', 'node', (evt) => {
  const tappedNode = evt.target

  // Deselect nếu click lại cùng node
  if (selectedNodeRef.current === tappedNode.id()) {
    resetHighlight(cy)
    selectedNodeRef.current = null
    return
  }

  selectedNodeRef.current = tappedNode.id()

  const neighborhood = tappedNode.closedNeighborhood()  // node + connected edges + neighbors
  const rest = cy.elements().not(neighborhood)

  cy.elements().removeClass('selected highlighted dimmed')
  tappedNode.addClass('selected')
  neighborhood.nodes().not(tappedNode).addClass('highlighted')
  neighborhood.edges().addClass('highlighted')
  rest.addClass('dimmed')
})

cy.on('tap', (evt) => {
  // Click vào empty space (target là cy chính nó)
  if (evt.target === cy) {
    resetHighlight(cy)
    selectedNodeRef.current = null
  }
})

function resetHighlight(cy) {
  cy.elements().removeClass('selected highlighted dimmed')
}
```

### Double-click behavior

```js
cy.on('dblclick', 'node', (evt) => {
  const node = evt.target
  const neighborhood = node.closedNeighborhood()
  cy.animate({ fit: { eles: neighborhood, padding: 40 } }, { duration: 400, easing: 'ease-in-out-cubic' })
})
```

---

## 3. Legend Node Type

### Position & Layout

- **Position**: `absolute`, bottom-right của canvas wrapper container
- **Offset**: `bottom: 12px; right: 12px`
- **Z-index**: `z-10` (dưới tooltip z-50, trên canvas)

```
┌──────────────────┐
│  ● Concept       │
│  ● Entity        │
│  ● Process       │
└──────────────────┘
```

### Style

```css
.kg-legend {
  position: absolute;
  bottom: 12px;
  right: 12px;
  z-index: 10;
  pointer-events: none;

  padding: 8px 12px;
  border-radius: 8px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);

  display: flex;
  flex-direction: column;
  gap: 6px;
}

.kg-legend-item {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
  white-space: nowrap;
}

.kg-legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
```

### Content (3 rows cố định)

| Row | Dot color | Label |
|---|---|---|
| concept | `colors.node` (accent — theo theme) | Concept |
| entity | `#10B981` | Entity |
| process | `#F59E0B` | Process |

Dot color của `concept` phải lấy từ `THEME_COLORS[theme].node` (dynamic, đổi theo theme) — không hardcode `#4F46E5`.

### Responsive — Ẩn trên mobile

```jsx
// Thêm class Tailwind: hidden sm:flex (ẩn khi < 640px, hiện từ 640px)
<div className="kg-legend hidden sm:flex flex-col gap-1.5">
```

---

## 4. Accessibility Table Fallback

### Toggle Trigger

Thêm button vào **header row** của KnowledgeGraphPanel, cạnh button "Fit":

```
[Table view]   ← khi đang xem graph
[Graph view]   ← khi đang xem table
```

**Button spec:**
- Variant: `ghost`
- Size: `sm`
- Icon: `TableIcon` (lucide-react `Table2`) + text label
- `aria-pressed`: `true` khi đang xem table, `false` khi đang xem graph
- `aria-label`: "Chuyển sang xem dạng bảng" / "Chuyển sang xem đồ thị"

```jsx
// State trong component
const [tableView, setTableView] = useState(false)

// Button JSX
<Button
  size="sm"
  variant="ghost"
  onClick={() => setTableView(v => !v)}
  aria-pressed={tableView}
  aria-label={tableView ? 'Chuyển sang xem đồ thị' : 'Chuyển sang xem dạng bảng'}
>
  {tableView ? <GraphIcon className="w-4 h-4" /> : <Table2 className="w-4 h-4" />}
  <span className="ml-1.5 hidden sm:inline">
    {tableView ? 'Graph view' : 'Table view'}
  </span>
</Button>
```

`GraphIcon`: dùng `Network` từ lucide-react (hoặc SVG tự vẽ nếu không có).

### Conditional Render

```jsx
{tableView ? (
  <KGTable nodes={kg.nodes} edges={kg.edges} cyRef={cyRef} />
) : (
  <div ref={containerRef} className="..." />
)}
```

Khi switch sang table view: Cytoscape container bị unmount nhưng `cyRef.current` vẫn giữ instance. Khi switch lại graph view: `renderGraph` cần được gọi lại (dùng `useEffect` với `tableView` dependency).

### Table Structure

Dùng **2 tabs** (Nodes / Edges) trong một component `KGTable`.

#### Tab bar

```
[Nodes ({n})]  [Edges ({m})]
```

- Tab active: `border-bottom: 2px solid var(--accent)`, `color: var(--text-primary)`, `font-weight: 600`
- Tab inactive: `color: var(--text-muted)`, `font-weight: 400`
- Tab transition: `border-color 150ms ease-out`

#### Nodes tab — Columns

| Column | Width | Content |
|---|---|---|
| # | 48px | Row index (1-based) |
| Label | flex-1 | `node.label` |
| Type | 100px | Badge: CONCEPT / ENTITY / PROCESS |
| Connections | 80px | Số edges có source hoặc target = node.id (tính từ `kg.edges`) |

**Type badge style:**
```css
.kg-type-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
/* concept: background = accent với 12% opacity, color = accent */
/* entity:  background = rgba(16,185,129,0.12), color = #10B981 */
/* process: background = rgba(245,158,11,0.12), color = #F59E0B */
```

#### Edges tab — Columns

| Column | Width | Content |
|---|---|---|
| Source | flex-1 | Label của source node (lookup từ nodes array) |
| Relation | flex-1 | `edge.relation` — font-style: italic |
| Target | flex-1 | Label của target node |

Relation cell: dùng mũi tên `→` giữa source và target làm visual separator (optional, ở mobile có thể bỏ).

#### Table style

```css
.kg-table-wrapper {
  overflow-y: auto;
  max-height: 420px;           /* khớp với canvas min-height 400px + padding */
  border: 1px solid var(--border);
  border-radius: 8px;
}

.kg-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.kg-table th {
  background: var(--bg-muted);
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 8px 12px;
  text-align: left;
  position: sticky;
  top: 0;
  z-index: 1;
  border-bottom: 1px solid var(--border);
}

.kg-table td {
  padding: 8px 12px;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}

.kg-table tr:last-child td {
  border-bottom: none;
}

.kg-table tbody tr:hover {
  background: var(--bg-muted);
  transition: background 100ms ease-out;
}
```

#### ARIA

```jsx
<table role="table" aria-label="Danh sách nodes trong Knowledge Graph">
  <thead>
    <tr role="row">
      <th scope="col">#</th>
      <th scope="col">Label</th>
      <th scope="col">Type</th>
      <th scope="col">Connections</th>
    </tr>
  </thead>
  <tbody>
    {nodes.map((node, i) => (
      <tr key={node.id} role="row">
        <td>{i + 1}</td>
        <td>{node.label}</td>
        <td><TypeBadge type={node.type} /></td>
        <td>{connectionCount(node.id)}</td>
      </tr>
    ))}
  </tbody>
</table>
```

---

## 5. Edge Label Improvement

### Vấn đề hiện tại

- `font-size: 9` — quá nhỏ, khó đọc
- Không có background — label lẫn với node/edge colors
- `text-rotation: autorotate` — hướng text xoay theo edge, gây khó đọc khi edge nghiêng

### Giải pháp đề xuất

Thay đổi selector `'edge'` trong `style` array:

```js
{
  selector: 'edge',
  style: {
    'width': 1.5,
    'line-color': colors.edge,
    'target-arrow-color': colors.edge,
    'target-arrow-shape': 'triangle',
    'curve-style': 'bezier',

    // Edge label improvements
    'label': 'data(label)',
    'font-size': 10,                          // tăng từ 9 → 10 (min legible)
    'color': colors.edge,
    'text-rotation': 'autorotate',            // giữ nguyên autorotate
    'text-background-color': colors.bg,       // background = canvas bg
    'text-background-opacity': 0.85,          // không đục hoàn toàn
    'text-background-padding': '3px',         // breathing room
    'text-background-shape': 'roundrectangle',
    'text-border-opacity': 0,                 // không cần border
    'font-weight': 400,
    'text-max-width': 80,
    'text-overflow-wrap': 'ellipsis',
    'opacity': 0.7,                           // edge mặc định hơi faded — giảm visual noise
  },
},
```

**Khi edge ở trạng thái `highlighted`** (đã spec ở mục 2):
```js
{
  selector: 'edge.highlighted',
  style: {
    'opacity': 1,
    'font-size': 11,
    'color': colors.node,                     // dùng accent thay vì edge muted color
    'text-background-color': colors.bg,
    'text-background-opacity': 0.95,
  },
}
```

**Lý do không tăng font-size lên cao hơn**: Graph với nhiều edges sẽ bị clutter nếu label quá lớn. Giải pháp là label rõ hơn khi hover/highlight thay vì tăng baseline size.

---

## 6. Implementation Notes cho Frontend Worker

### File cần chỉnh sửa

Chỉ có 1 file: `frontend/src/features/document/understand-mode/KnowledgeGraphPanel.jsx`

CSS classes mới (`kg-tooltip`, `kg-legend`, `kg-table`) có thể viết inline Tailwind trong JSX hoặc thêm vào `index.css`. **Khuyến nghị**: dùng Tailwind classes cho layout/spacing, `style` prop cho dynamic values (x, y coordinates, dot colors).

### Thứ tự implement

1. Edge label improvements (thay đổi style object trong `renderGraph` — đơn giản nhất)
2. Legend (thêm JSX fixed element vào canvas wrapper)
3. Hover tooltip (thêm state + event handlers + DOM element)
4. Click highlight (thêm Cytoscape selectors + event handlers)
5. Accessibility table (tách thành component riêng `KGTable.jsx`)

### State shape cần thêm

```js
const [tableView, setTableView] = useState(false)
const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, label: '', type: '', degree: 0 })
const selectedNodeRef = useRef(null)
const tooltipTimeoutRef = useRef(null)   // cho delay 120ms
```

### Cytoscape event cleanup

Mọi `cy.on(...)` phải được xóa khi component unmount hoặc khi `renderGraph` được gọi lại:

```js
// Cuối renderGraph function, trước khi return:
cyRef.current.on('mouseover', 'node', handleNodeHover)
cyRef.current.on('mouseout', 'node', handleNodeOut)
cyRef.current.on('tap', 'node', handleNodeTap)
cyRef.current.on('tap', handleCanvasTap)
cyRef.current.on('dblclick', 'node', handleNodeDblClick)
```

Hoặc: thêm event handlers vào `useEffect` riêng (watch `kg` + `theme`) để tách khỏi `renderGraph`.

### Z-index stack trong canvas container

```
z-0   — Cytoscape canvas
z-10  — Legend
z-50  — Tooltip
```

Container wrapper cần `position: relative` và `overflow: hidden` để clip tooltip.

---

## 7. Điểm quyết định đã xác nhận

| # | Quyết định | Lý do |
|---|---|---|
| 1 | Tooltip là DOM element, không phải Cytoscape label | DOM tooltip có thể dùng CSS variables + theme-aware; Cytoscape label không support |
| 2 | Tooltip delay 120ms (không instant) | Tránh tooltip nhấp nháy khi user di chuột qua graph nhanh |
| 3 | Deselect bằng click lần 2 (không dùng Escape) | Escape đã dùng cho Focus mode exit; tránh conflict |
| 4 | Legend ở bottom-right | Top-left là khu vực header; top-right che nút Fit; bottom-left ít bị che bởi nodes nhất (thứ 2 sau bottom-right) — bottom-right tận dụng khoảng padding thường trống |
| 5 | Table fallback dùng 2 tabs (không phải 1 table dài) | Nodes và Edges có schema khác nhau; 2 tabs rõ ràng hơn; dễ navigate với screen reader |
| 6 | Edge opacity mặc định 0.7 | Giảm visual noise; graph đông edges sẽ không quá nặng; highlighted edges nổi bật hơn |

---

## 8. Open Questions — cần PM xác nhận trước khi implement

| # | Câu hỏi | Tác động |
|---|---|---|
| OQ-1 | Khi user click một node và sau đó nhấn "Fit", nên reset highlight về default không? Hay giữ selection và chỉ fit viewport? | Nếu reset: UX đơn giản hơn; nếu giữ: user có thể Fit để xem ego network trong viewport rõ hơn |
| OQ-2 | Edge label có nên bị ẩn hoàn toàn khi graph có > N edges (ví dụ > 30 edges) không? | Graph quá dày đặc: label chồng chéo, gây rối. Cần ngưỡng N hoặc toggle "Show labels" |
| OQ-3 | Table fallback có cần persist state (localStorage) không? Hay reset về graph view mỗi lần reload trang? | Nếu persist: user screen reader không phải toggle lại mỗi lần; scope nhỏ (thêm 1 localStorage key) |
| OQ-4 | Tooltip có hiện trên mobile (640px–1023px) không? | Hiện tại spec nói ẩn < 640px; tablet 640–1023px chưa xác định — touch device không có hover |

**Khuyến nghị của Designer**: OQ-1 → reset highlight khi Fit; OQ-2 → ẩn label khi > 25 edges + thêm toggle; OQ-3 → không persist (complexity không xứng); OQ-4 → ẩn trên touch device (dùng `@media (hover: none)` để detect).
