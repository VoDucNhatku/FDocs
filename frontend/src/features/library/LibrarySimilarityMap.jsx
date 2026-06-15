import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import cytoscape from 'cytoscape'
import { useTheme } from '@/context/ThemeContext'

const THEME_COLORS = {
  neutral: { node: '#4F46E5', nodeText: '#fff', edge: '#CBD5E1', edgeHighlight: '#818CF8', bg: '#F8FAFC' },
  cream:   { node: '#B45309', nodeText: '#fff', edge: '#D4C5B0', edgeHighlight: '#D97706', bg: '#FDFBF7' },
  dark:    { node: '#818CF8', nodeText: '#fff', edge: '#3F3F46', edgeHighlight: '#A5B4FC', bg: '#09090B' },
}

function edgeWidth(similarity) {
  return 1 + ((similarity - 0.65) / 0.35) * 3
}

function nodeOpacity(wordCount, maxWordCount) {
  if (!maxWordCount) return 0.75
  return 0.5 + 0.5 * ((wordCount || 1) / maxWordCount)
}

export function LibrarySimilarityMap({ nodes, edges }) {
  const containerRef = useRef(null)
  const cyRef = useRef(null)
  const tooltipRef = useRef(null)
  const { theme } = useTheme()
  const navigate = useNavigate()

  const colors = THEME_COLORS[theme] ?? THEME_COLORS.neutral
  const maxWordCount = Math.max(...nodes.map((n) => n.word_count || 1), 1)

  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return
    cyRef.current?.destroy()

    const elements = [
      ...nodes.map((n) => ({
        data: { id: n.id, label: n.title, word_count: n.word_count },
      })),
      ...edges.map((e, i) => ({
        data: {
          id: `e${i}`,
          source: e.source,
          target: e.target,
          similarity: e.similarity,
          width: edgeWidth(e.similarity),
        },
      })),
    ]

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': colors.node,
            'background-opacity': (el) => nodeOpacity(el.data('word_count'), maxWordCount),
            'label': 'data(label)',
            'color': colors.nodeText,
            'font-size': 11,
            'text-valign': 'center',
            'text-halign': 'center',
            'width': 64,
            'height': 64,
            'shape': 'ellipse',
            'text-wrap': 'wrap',
            'text-max-width': 56,
            'border-width': 0,
            'cursor': 'pointer',
          },
        },
        {
          selector: 'edge',
          style: {
            'width': 'data(width)',
            'line-color': colors.edge,
            'opacity': 0.65,
            'curve-style': 'bezier',
          },
        },
        {
          selector: 'node.hovered',
          style: {
            'border-width': 3,
            'border-color': colors.edgeHighlight,
            'border-opacity': 1,
          },
        },
        {
          selector: 'edge.highlighted',
          style: {
            'line-color': colors.edgeHighlight,
            'opacity': 1,
          },
        },
        {
          selector: 'edge.dimmed',
          style: { 'opacity': 0.1 },
        },
      ],
      layout: {
        name: 'cose',
        animate: true,
        animationDuration: 1200,
        animationEasing: 'ease-in-out-cubic',
        idealEdgeLength: 160,
        nodeRepulsion: 12000,
        fit: true,
        padding: 48,
      },
    })

    const cy = cyRef.current

    cy.on('mouseover', 'node', (e) => {
      const node = e.target
      node.addClass('hovered')
      const connected = node.connectedEdges()
      cy.edges().addClass('dimmed')
      connected.removeClass('dimmed').addClass('highlighted')

      if (tooltipRef.current) {
        const pos = node.renderedPosition()
        const rect = containerRef.current.getBoundingClientRect()
        tooltipRef.current.textContent = node.data('label')
        tooltipRef.current.style.left = `${rect.left + pos.x}px`
        tooltipRef.current.style.top = `${rect.top + pos.y - 52}px`
        tooltipRef.current.style.display = 'block'
      }
    })

    cy.on('mouseout', 'node', (e) => {
      e.target.removeClass('hovered')
      cy.edges().removeClass('dimmed highlighted')
      if (tooltipRef.current) tooltipRef.current.style.display = 'none'
    })

    cy.on('tap', 'node', (e) => {
      navigate(`/document/${e.target.id()}`)
    })

    return () => {
      cy.destroy()
      if (tooltipRef.current) tooltipRef.current.style.display = 'none'
    }
  }, [nodes, edges, theme])

  if (nodes.length < 2) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-[var(--text-muted)] text-center px-6">
        Upload ít nhất 2 tài liệu để xem bản đồ tương đồng.
      </div>
    )
  }

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="w-full rounded-xl border border-[var(--border)]"
        style={{ height: 520, background: colors.bg }}
      />

      {edges.length === 0 && (
        <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none">
          <p className="text-xs text-[var(--text-muted)] bg-[var(--bg-surface)] border border-[var(--border)] rounded-full px-4 py-1.5">
            Các tài liệu chưa đủ liên quan để vẽ liên kết (similarity &lt; 65%)
          </p>
        </div>
      )}

      {/* Fixed tooltip — position managed via DOM ref for performance */}
      <div
        ref={tooltipRef}
        className="pointer-events-none fixed z-50 max-w-[180px] rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] shadow-lg"
        style={{ display: 'none', transform: 'translateX(-50%)' }}
      />
    </div>
  )
}
