import { useState } from 'react'

const NODE_TYPE_COLORS = {
  concept: null,   // filled dynamically from accent
  entity: '#10B981',
  process: '#F59E0B',
}

function TypeBadge({ type }) {
  const normalized = type?.toLowerCase() ?? 'concept'

  const styles = {
    concept: {
      background: 'rgba(79,70,229,0.12)',
      color: 'var(--accent)',
    },
    entity: {
      background: 'rgba(16,185,129,0.12)',
      color: '#10B981',
    },
    process: {
      background: 'rgba(245,158,11,0.12)',
      color: '#F59E0B',
    },
  }

  const badgeStyle = styles[normalized] ?? styles.concept

  return (
    <span
      style={badgeStyle}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-[0.04em]"
    >
      {type?.toUpperCase() ?? 'CONCEPT'}
    </span>
  )
}

export function KGTable({ nodes = [], edges = [] }) {
  const [activeTab, setActiveTab] = useState('nodes')

  const connectionCount = (nodeId) =>
    edges.filter((e) => e.source === nodeId || e.target === nodeId).length

  const nodeById = (id) => nodes.find((n) => n.id === id)

  const tabClass = (tab) =>
    tab === activeTab
      ? 'border-b-2 border-[var(--accent)] text-[var(--text-primary)] font-semibold pb-2 px-1 text-sm transition-colors duration-150'
      : 'border-b-2 border-transparent text-[var(--text-muted)] font-normal pb-2 px-1 text-sm hover:text-[var(--text-primary)] transition-colors duration-150'

  return (
    <div className="flex flex-col gap-3 flex-1">
      {/* Tab bar */}
      <div className="flex gap-4 border-b border-[var(--border)]">
        <button className={tabClass('nodes')} onClick={() => setActiveTab('nodes')}>
          Nodes ({nodes.length})
        </button>
        <button className={tabClass('edges')} onClick={() => setActiveTab('edges')}>
          Edges ({edges.length})
        </button>
      </div>

      {/* Table */}
      <div
        className="overflow-y-auto rounded-lg border border-[var(--border)]"
        style={{ maxHeight: '420px' }}
      >
        {activeTab === 'nodes' ? (
          <table
            role="table"
            aria-label="Danh sách nodes trong Knowledge Graph"
            className="w-full border-collapse text-[13px]"
          >
            <thead>
              <tr role="row">
                <th
                  scope="col"
                  className="sticky top-0 z-[1] bg-[var(--bg-muted)] text-[var(--text-muted)] text-[11px] font-semibold uppercase tracking-[0.05em] px-3 py-2 text-left border-b border-[var(--border)]"
                  style={{ width: '48px' }}
                >
                  #
                </th>
                <th
                  scope="col"
                  className="sticky top-0 z-[1] bg-[var(--bg-muted)] text-[var(--text-muted)] text-[11px] font-semibold uppercase tracking-[0.05em] px-3 py-2 text-left border-b border-[var(--border)]"
                >
                  Label
                </th>
                <th
                  scope="col"
                  className="sticky top-0 z-[1] bg-[var(--bg-muted)] text-[var(--text-muted)] text-[11px] font-semibold uppercase tracking-[0.05em] px-3 py-2 text-left border-b border-[var(--border)]"
                  style={{ width: '100px' }}
                >
                  Type
                </th>
                <th
                  scope="col"
                  className="sticky top-0 z-[1] bg-[var(--bg-muted)] text-[var(--text-muted)] text-[11px] font-semibold uppercase tracking-[0.05em] px-3 py-2 text-left border-b border-[var(--border)]"
                  style={{ width: '80px' }}
                >
                  Conns
                </th>
              </tr>
            </thead>
            <tbody>
              {nodes.map((node, i) => (
                <tr
                  key={node.id}
                  role="row"
                  className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-muted)] transition-colors duration-100"
                >
                  <td className="px-3 py-2 text-[var(--text-muted)]">{i + 1}</td>
                  <td className="px-3 py-2 text-[var(--text-primary)]">{node.label}</td>
                  <td className="px-3 py-2">
                    <TypeBadge type={node.type} />
                  </td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">{connectionCount(node.id)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table
            role="table"
            aria-label="Danh sách edges trong Knowledge Graph"
            className="w-full border-collapse text-[13px]"
          >
            <thead>
              <tr role="row">
                <th
                  scope="col"
                  className="sticky top-0 z-[1] bg-[var(--bg-muted)] text-[var(--text-muted)] text-[11px] font-semibold uppercase tracking-[0.05em] px-3 py-2 text-left border-b border-[var(--border)]"
                >
                  Source
                </th>
                <th
                  scope="col"
                  className="sticky top-0 z-[1] bg-[var(--bg-muted)] text-[var(--text-muted)] text-[11px] font-semibold uppercase tracking-[0.05em] px-3 py-2 text-left border-b border-[var(--border)]"
                >
                  Relation
                </th>
                <th
                  scope="col"
                  className="sticky top-0 z-[1] bg-[var(--bg-muted)] text-[var(--text-muted)] text-[11px] font-semibold uppercase tracking-[0.05em] px-3 py-2 text-left border-b border-[var(--border)]"
                >
                  Target
                </th>
              </tr>
            </thead>
            <tbody>
              {edges.map((edge, i) => {
                const sourceNode = nodeById(edge.source)
                const targetNode = nodeById(edge.target)
                return (
                  <tr
                    key={i}
                    role="row"
                    className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-muted)] transition-colors duration-100"
                  >
                    <td className="px-3 py-2 text-[var(--text-primary)]">
                      {sourceNode?.label ?? edge.source}
                    </td>
                    <td className="px-3 py-2 text-[var(--text-muted)] italic">
                      {edge.relation}
                    </td>
                    <td className="px-3 py-2 text-[var(--text-primary)]">
                      {targetNode?.label ?? edge.target}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
