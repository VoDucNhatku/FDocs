import { useState } from 'react'
import { analysisService } from '@/services/analysis'
import { Button } from '@/components/ui/Button'

export function SummaryPanel({ docId, cached, onUpdate }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const generate = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await analysisService.summarize(docId)
      onUpdate(data.summary)
    } catch {
      setError('Không thể tạo tóm tắt. Kiểm tra Gemini Key.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[var(--text-primary)]">Tóm tắt</h3>
        <Button size="sm" variant="outline" onClick={generate} loading={loading}>
          {cached ? 'Tạo lại' : 'Tạo tóm tắt'}
        </Button>
      </div>

      {loading && (
        <div className="space-y-2 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-3 rounded bg-[var(--bg-muted)]" style={{ width: `${85 + Math.random() * 15}%` }} />
          ))}
        </div>
      )}

      {!loading && cached && (
        <div className="prose-reading rounded-xl bg-[var(--bg-muted)] p-5 leading-relaxed text-[var(--text-primary)]">
          {cached}
        </div>
      )}

      {!loading && !cached && (
        <p className="text-sm text-[var(--text-muted)]">Nhấn "Tạo tóm tắt" để phân tích tài liệu.</p>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
