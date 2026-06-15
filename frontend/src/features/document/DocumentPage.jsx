import { useEffect, useState } from 'react'
import { useParams, useOutletContext } from 'react-router-dom'
import { documentService } from '@/services/documents'
import { analysisService } from '@/services/analysis'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { SummaryPanel } from './read-mode/SummaryPanel'
import { KeywordsPanel } from './read-mode/KeywordsPanel'
import { RelevancePanel } from './read-mode/RelevancePanel'
import { TimePlanPanel } from './read-mode/TimePlanPanel'
import { RelatedDocsPanel } from './read-mode/RelatedDocsPanel'
import { KnowledgeGraphPanel } from './understand-mode/KnowledgeGraphPanel'
import { QAPanel } from './understand-mode/QAPanel'
import { cn } from '@/utils/cn'

const READ_TABS = ['Tóm tắt', 'Từ khóa', 'Độ phù hợp', 'Kế hoạch đọc', 'Tài liệu liên quan']
const UNDERSTAND_TABS = ['Knowledge Graph', 'Hỏi & Đáp']

export function DocumentPage() {
  const { docId } = useParams()
  const { pendingAction, clearAction } = useOutletContext() ?? {}
  const [doc, setDoc] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [mode, setMode] = useState('read')
  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([documentService.get(docId), analysisService.getAll(docId)])
      .then(([d, a]) => { setDoc(d); setAnalysis(a) })
      .finally(() => setLoading(false))
  }, [docId])

  useEffect(() => {
    if (!pendingAction) return
    const actionMap = {
      summarize: () => { setMode('read'); setActiveTab(0) },
      keywords: () => { setMode('read'); setActiveTab(1) },
      relevance: () => { setMode('read'); setActiveTab(2) },
      'time-plan': () => { setMode('read'); setActiveTab(3) },
      kg: () => { setMode('understand'); setActiveTab(0) },
      qa: () => { setMode('understand'); setActiveTab(1) },
    }
    actionMap[pendingAction]?.()
    clearAction?.()
  }, [pendingAction])

  if (loading) return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>
  if (!doc) return <div className="p-6 text-[var(--text-muted)]">Tài liệu không tồn tại.</div>

  const tabs = mode === 'read' ? READ_TABS : UNDERSTAND_TABS

  return (
    <div className="flex h-full">
      {/* Left: doc info + tabs */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Doc header */}
        <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-surface)]">
          <h2 className="font-semibold text-[var(--text-primary)] truncate">{doc.title}</h2>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-[var(--text-muted)] uppercase">{doc.file_type}</span>
            {doc.word_count && <span className="text-xs text-[var(--text-muted)]">{doc.word_count.toLocaleString()} từ</span>}
            {doc.page_count && <span className="text-xs text-[var(--text-muted)]">{doc.page_count} trang</span>}
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-1 px-6 py-3 border-b border-[var(--border)]">
          <Button
            variant={mode === 'read' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => { setMode('read'); setActiveTab(0) }}
          >
            Đọc thông minh
          </Button>
          <Button
            variant={mode === 'understand' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => { setMode('understand'); setActiveTab(0) }}
          >
            Hiểu sâu
          </Button>
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-1 px-6 py-2 border-b border-[var(--border)] overflow-x-auto">
          {tabs.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={cn(
                'shrink-0 rounded-md px-3 py-1.5 text-sm transition-colors',
                activeTab === i
                  ? 'bg-[var(--bg-muted)] text-[var(--text-primary)] font-medium'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Panel */}
        <div className="flex-1 overflow-y-auto p-6">
          {mode === 'read' && (
            <>
              {activeTab === 0 && <SummaryPanel docId={docId} cached={analysis?.summary} onUpdate={(v) => setAnalysis((a) => ({ ...a, summary: v }))} />}
              {activeTab === 1 && <KeywordsPanel docId={docId} cached={analysis?.keywords} onUpdate={(v) => setAnalysis((a) => ({ ...a, keywords: v }))} />}
              {activeTab === 2 && <RelevancePanel docId={docId} cached={analysis?.relevance_score} input={analysis?.relevance_input} onUpdate={(v) => setAnalysis((a) => ({ ...a, ...v }))} />}
              {activeTab === 3 && <TimePlanPanel docId={docId} cached={analysis?.time_plan} input={analysis?.time_plan_input} onUpdate={(v) => setAnalysis((a) => ({ ...a, time_plan: v }))} />}
              {activeTab === 4 && <RelatedDocsPanel docId={docId} />}
            </>
          )}
          {mode === 'understand' && (
            <>
              {activeTab === 0 && <KnowledgeGraphPanel docId={docId} cached={analysis?.kg} onUpdate={(v) => setAnalysis((a) => ({ ...a, kg: v }))} />}
              {activeTab === 1 && <QAPanel docId={docId} />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
