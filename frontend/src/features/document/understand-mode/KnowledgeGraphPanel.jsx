import { useEffect, useRef, useState } from 'react'
import cytoscape from 'cytoscape'
import { Table2, Network } from 'lucide-react'
import { analysisService } from '@/services/analysis'
import { useTheme } from '@/context/ThemeContext'
import { Button } from '@/components/ui/Button'
import { KGTable } from './KGTable'

const THEME_COLORS = {
  neutral: { node: '#4F46E5', nodeText: '#fff', edge: '#CBD5E1', edgeLabel: '#64748B', bg: '#F8FAFC' },
  cream:   { node: '#B45309', nodeText: '#fff', edge: '#D4C5B0', edgeLabel: '#7C6E5C', bg: '#FDFBF7' },
  dark:    { node: '#818CF8', nodeText: '#fff', edge: '#52525B', edgeLabel: '#A1A1AA', bg: '#09090B' },
}

const COSE_LAYOUT = {
  name: 'cose',
  animate: true,
  animationDuration: 1200,
  animationEasing: 'ease-in-out-cubic',
  idealEdgeLength: 160,
  nodeRepulsion: 450000,
  gravity: 0.25,
  numIter: 1500,
  initialTemp: 200,
  coolingFactor: 0.95,
  minTemp: 1.0,
  fit: true,
  padding: 40,
}

const NODE_TYPE_COLORS = {
  concept: null,
  entity: '#10B981',
  process: '#F59E0B',
}

const LEGEND_ITEMS = [
  { type: 'concept', label: 'Concept' },
  { type: 'entity', label: 'Entity' },
  { type: 'process', label: 'Process' },
]

export function KnowledgeGraphPanel({ docId, cached, onUpdate }) {
  const containerRef = useRef(null)
  const cyRef = useRef(null)
  const selectedNodeRef = useRef(null)
  const tooltipTimeoutRef = useRef(null)
  const { theme } = useTheme()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [kg, setKg] = useState(cached ?? null)
  const [tableView, setTableView] = useState(false)
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, label: '', type: '', degree: 0 })
  const [showEdgeLabels, setShowEdgeLabels] = useState(true)

  // Detect touch device — ẩn tooltip
  const isTouchDevice = useRef(
    typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches
  )

  const resetHighlight = (cy) => {
    cy.elements().removeClass('selected highlighted dimmed')
  }

  const renderGraph = (data, colors) => {
    if (!containerRef.current || !data) return
    cyRef.current?.destroy()
    selectedNodeRef.current = null

    const edgeCount = data.edges.length
    const labelsVisible = edgeCount <= 25

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
            'font-size': 12,
            'text-valign': 'center',
            'text-halign': 'center',
            'width': 'label',
            'height': 'label',
            'padding': '10px 14px',
            'shape': 'round-rectangle',
            'text-wrap': 'wrap',
            'text-max-width': 130,
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
            'label': labelsVisible ? 'data(label)' : '',
            'font-size': 10,
            'color': colors.edgeLabel,
            'text-rotation': 'autorotate',
            'text-background-color': colors.bg,
            'text-background-opacity': 0.92,
            'text-background-padding': '3px',
            'text-background-shape': 'roundrectangle',
            'text-border-opacity': 0,
            'font-weight': 400,
            'text-max-width': 80,
            'text-overflow': 'ellipsis',
            'opacity': 0.7,
          },
        },
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
          },
        },
        {
          selector: 'edge.highlighted',
          style: {
            'width': 2.5,
            'opacity': 1,
            'line-color': colors.node,
            'target-arrow-color': colors.node,
            'label': 'data(label)',
            'font-size': 11,
            'color': colors.node,
            'text-background-color': colors.bg,
            'text-background-opacity': 0.95,
            'transition-property': 'opacity, width',
            'transition-duration': '200ms',
            'transition-timing-function': 'ease-out',
          },
        },
      ],
      layout: COSE_LAYOUT,
      backgroundColor: colors.bg,
    })

    const cy = cyRef.current

    // Hover tooltip
    if (!isTouchDevice.current) {
      cy.on('mouseover', 'node', (evt) => {
        clearTimeout(tooltipTimeoutRef.current)
        const node = evt.target
        tooltipTimeoutRef.current = setTimeout(() => {
          if (!containerRef.current) return
          const renderedPos = node.renderedPosition()
          const canvasW = containerRef.current.offsetWidth
          const canvasH = containerRef.current.offsetHeight
          const TOOLTIP_W = 220
          const TOOLTIP_H = 96

          let x = renderedPos.x + 12
          let y = renderedPos.y - 60

          if (x + TOOLTIP_W > canvasW) x = renderedPos.x - TOOLTIP_W - 12
          if (y < 0) y = renderedPos.y + 20

          const label = node.data('label') ?? ''
          const truncated = label.length > 40 ? label.slice(0, 40) + '…' : label
          const degree = node.degree()

          setTooltip({
            visible: true,
            x,
            y,
            label: truncated,
            type: node.data('type') ?? 'concept',
            degree,
          })
        }, 120)
      })

      cy.on('mouseout', 'node', () => {
        clearTimeout(tooltipTimeoutRef.current)
        setTooltip((prev) => ({ ...prev, visible: false }))
      })

      cy.on('mousedown', () => {
        clearTimeout(tooltipTimeoutRef.current)
        setTooltip((prev) => ({ ...prev, visible: false }))
      })
    }

    // Click highlight (ego network)
    cy.on('tap', 'node', (evt) => {
      const tappedNode = evt.target

      if (selectedNodeRef.current === tappedNode.id()) {
        resetHighlight(cy)
        selectedNodeRef.current = null
        return
      }

      selectedNodeRef.current = tappedNode.id()

      const neighborhood = tappedNode.closedNeighborhood()
      const rest = cy.elements().not(neighborhood)

      cy.elements().removeClass('selected highlighted dimmed')
      tappedNode.addClass('selected')
      neighborhood.nodes().not(tappedNode).addClass('highlighted')
      neighborhood.edges().addClass('highlighted')
      rest.addClass('dimmed')
    })

    // Click empty space → reset
    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        resetHighlight(cy)
        selectedNodeRef.current = null
      }
    })

    // Double-click → fit neighborhood
    cy.on('dblclick', 'node', (evt) => {
      const node = evt.target
      const neighborhood = node.closedNeighborhood()
      cy.animate(
        { fit: { eles: neighborhood, padding: 40 } },
        { duration: 400, easing: 'ease-in-out-cubic' }
      )
    })
  }

  // Re-render khi theme, kg, hoặc tableView thay đổi
  useEffect(() => {
    if (!tableView && kg) renderGraph(kg, THEME_COLORS[theme] ?? THEME_COLORS.neutral)
  }, [theme, kg, tableView])

  // Apply/remove edge labels khi toggle (OQ-2)
  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    const edgeCount = kg?.edges?.length ?? 0
    if (edgeCount > 25) {
      cy.style()
        .selector('edge')
        .style({ label: showEdgeLabels ? 'data(label)' : '' })
        .update()
    }
  }, [showEdgeLabels, kg])

  useEffect(() => () => {
    clearTimeout(tooltipTimeoutRef.current)
    cyRef.current?.destroy()
  }, [])

  const handleFit = () => {
    if (cyRef.current) {
      resetHighlight(cyRef.current)
      selectedNodeRef.current = null
      cyRef.current.fit(30)
    }
  }

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

  const colors = THEME_COLORS[theme] ?? THEME_COLORS.neutral
  const edgeCount = kg?.edges?.length ?? 0
  const hasMany = edgeCount > 25

  const tooltipDotColor = tooltip.type
    ? (NODE_TYPE_COLORS[tooltip.type.toLowerCase()] ?? colors.node)
    : colors.node

  return (
    <div className="flex flex-col gap-4 h-full px-5 pt-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-[var(--text-primary)]">Knowledge Graph</h3>
          {kg && (
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {kg.nodes.length} nodes · {kg.edges.length} edges
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {kg && (
            <>
              {/* OQ-2: toggle edge labels khi > 25 edges */}
              {hasMany && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowEdgeLabels((v) => !v)}
                >
                  {showEdgeLabels ? 'Hide labels' : 'Show labels'}
                </Button>
              )}

              {/* Table/Graph view toggle */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setTableView((v) => !v)}
                aria-pressed={tableView}
                aria-label={tableView ? 'Chuyển sang xem đồ thị' : 'Chuyển sang xem dạng bảng'}
              >
                {tableView ? (
                  <Network className="w-4 h-4" />
                ) : (
                  <Table2 className="w-4 h-4" />
                )}
                <span className="ml-1.5 hidden sm:inline">
                  {tableView ? 'Graph view' : 'Table view'}
                </span>
              </Button>

              {!tableView && (
                <>
                  <Button size="sm" variant="ghost" onClick={handleFit}>
                    Fit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const cy = cyRef.current
                      if (!cy) return
                      resetHighlight(cy)
                      selectedNodeRef.current = null
                      cy.layout(COSE_LAYOUT).run()
                    }}
                  >
                    Rearrange
                  </Button>
                </>
              )}
            </>
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

      {kg && tableView && (
        <KGTable nodes={kg.nodes} edges={kg.edges} />
      )}

      {kg && !tableView && (
        <div
          className="relative flex-1 min-h-[400px] rounded-xl border border-[var(--border)] overflow-hidden"
          style={{ background: colors.bg }}
        >
          {/* Cytoscape canvas */}
          <div ref={containerRef} className="w-full h-full" />

          {/* Legend */}
          <div
            className="absolute bottom-3 right-3 z-10 pointer-events-none hidden sm:flex flex-col gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)]"
            style={{ background: 'var(--bg-surface)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
          >
            {LEGEND_ITEMS.map(({ type, label }) => {
              const dotColor = NODE_TYPE_COLORS[type] ?? colors.node
              return (
                <div key={type} className="flex items-center gap-[7px] text-[11px] font-medium text-[var(--text-muted)] whitespace-nowrap">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: dotColor }}
                  />
                  {label}
                </div>
              )
            })}
          </div>

          {/* Hover tooltip */}
          {!isTouchDevice.current && (
            <div
              className="absolute z-50 pointer-events-none w-[220px] px-3 py-2.5 rounded-lg border border-[var(--border)]"
              style={{
                left: tooltip.x,
                top: tooltip.y,
                background: 'var(--bg-surface)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)',
                opacity: tooltip.visible ? 1 : 0,
                transform: tooltip.visible ? 'translateY(0)' : 'translateY(4px)',
                transition: 'opacity 120ms ease-out, transform 120ms ease-out',
              }}
            >
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.05em] mb-1">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: tooltipDotColor }}
                />
                {tooltip.type?.toUpperCase()}
              </div>
              <div className="text-[14px] font-semibold text-[var(--text-primary)] leading-[1.3] mb-1 break-words">
                {tooltip.label}
              </div>
              <div className="text-[12px] text-[var(--text-muted)]">
                {tooltip.degree} {tooltip.degree === 1 ? 'connection' : 'connections'}
              </div>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-[var(--error)]">{error}</p>}
    </div>
  )
}
