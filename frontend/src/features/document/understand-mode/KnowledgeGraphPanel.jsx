import { useEffect, useRef, useState } from 'react'
import cytoscape from 'cytoscape'
import { analysisService } from '@/services/analysis'
import { useTheme } from '@/context/ThemeContext'
import { Button } from '@/components/ui/Button'

const THEME_COLORS = {
  neutral: { node: '#4F46E5', nodeText: '#fff', edge: '#CBD5E1', bg: '#F8FAFC' },
  cream: { node: '#B45309', nodeText: '#fff', edge: '#D4C5B0', bg: '#FDFBF7' },
  dark: { node: '#818CF8', nodeText: '#fff', edge: '#3F3F46', bg: '#09090B' },
}

const NODE_TYPE_COLORS = {
  concept: null,
  entity: '#10B981',
  process: '#F59E0B',
}

export function KnowledgeGraphPanel({ docId, cached, onUpdate }) {
  const containerRef = useRef(null)
  const cyRef = useRef(null)
  const { theme } = useTheme()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [kg, setKg] = useState(cached ?? null)

  const renderGraph = (data, colors) => {
    if (!containerRef.current || !data) return
    cyRef.current?.destroy()

    const elements = [
      ...data.nodes.map((n) => ({
        data: { id: n.id, label: n.label, type: n.type },
      })),
      ...data.edges.map((e, i) => ({
        data: { id: `e${i}`, source: e.source, target: e.target, label: e.relation },
      })),
    ]

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (el) => NODE_TYPE_COLORS[el.data('type')] ?? colors.node,
            'label': 'data(label)',
            'color': colors.nodeText,
            'font-size': 11,
            'text-valign': 'center',
            'text-halign': 'center',
            'width': 80,
            'height': 30,
            'shape': 'round-rectangle',
            'text-wrap': 'wrap',
            'text-max-width': 75,
          },
        },
        {
          selector: 'edge',
          style: {
            'width': 1.5,
            'line-color': colors.edge,
            'target-arrow-color': colors.edge,
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': 9,
            'color': colors.edge,
            'text-rotation': 'autorotate',
          },
        },
      ],
      layout: {
        name: 'cose',
        animate: true,
        animationDuration: 1500,
        animationEasing: 'ease-in-out-cubic',
        idealEdgeLength: 100,
        nodeRepulsion: 8000,
        fit: true,
        padding: 30,
      },
      backgroundColor: colors.bg,
    })
  }

  useEffect(() => {
    if (kg) renderGraph(kg, THEME_COLORS[theme] ?? THEME_COLORS.neutral)
  }, [theme, kg])

  useEffect(() => () => cyRef.current?.destroy(), [])

  const generate = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await analysisService.knowledgeGraph(docId)
      setKg(data.kg)
      onUpdate(data.kg)
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Không thể tạo Knowledge Graph. Thử lại sau.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-[var(--text-primary)]">Knowledge Graph</h3>
          {kg && (
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {kg.nodes.length} nodes · {kg.edges.length} edges
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {kg && (
            <Button size="sm" variant="ghost" onClick={() => cyRef.current?.fit(30)}>Fit</Button>
          )}
          <Button size="sm" variant="outline" onClick={generate} loading={loading}>
            {kg ? 'Tạo lại' : 'Tạo graph'}
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 animate-ping rounded-full bg-[var(--accent)] opacity-20" />
            <div className="absolute inset-2 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          </div>
          <p className="text-sm text-[var(--text-muted)]">Đang phân tích cấu trúc tri thức...</p>
        </div>
      )}

      {!loading && !kg && (
        <div className="flex h-64 items-center justify-center text-sm text-[var(--text-muted)]">
          Nhấn "Tạo graph" để khám phá mạng lưới khái niệm trong tài liệu.
        </div>
      )}

      {kg && (
        <div
          ref={containerRef}
          className="flex-1 min-h-[400px] rounded-xl border border-[var(--border)]"
          style={{ background: THEME_COLORS[theme]?.bg }}
        />
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
