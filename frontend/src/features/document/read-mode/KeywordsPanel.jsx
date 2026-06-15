import { useState } from 'react'
import { analysisService } from '@/services/analysis'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

export function KeywordsPanel({ docId, cached, onUpdate }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const generate = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await analysisService.keywords(docId)
      onUpdate(data.keywords)
    } catch {
      setError('Không thể trích xuất từ khóa.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[var(--text-primary)]">Từ khóa & Khái niệm</h3>
        <Button size="sm" variant="outline" onClick={generate} loading={loading}>
          {cached ? 'Trích xuất lại' : 'Trích xuất'}
        </Button>
      </div>

      {loading && (
        <div className="flex flex-wrap gap-2">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="h-6 w-20 rounded-full bg-[var(--bg-muted)] animate-pulse" />
          ))}
        </div>
      )}

      {!loading && cached && (
        <div className="flex flex-wrap gap-2">
          {cached.map((kw) => (
            <Badge key={kw} className="text-sm py-1 px-3">{kw}</Badge>
          ))}
        </div>
      )}

      {!loading && !cached && (
        <p className="text-sm text-[var(--text-muted)]">Nhấn "Trích xuất" để lấy từ khóa.</p>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
