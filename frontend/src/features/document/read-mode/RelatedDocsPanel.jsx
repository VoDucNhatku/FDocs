import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { analysisService } from '@/services/analysis'
import { Spinner } from '@/components/ui/Spinner'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export function RelatedDocsPanel({ docId }) {
  const [docs, setDocs] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    analysisService.related(docId)
      .then(setDocs)
      .finally(() => setLoading(false))
  }, [docId])

  if (loading) return <div className="flex h-32 items-center justify-center"><Spinner /></div>

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-semibold text-[var(--text-primary)]">Tài liệu liên quan</h3>
      {docs?.length === 0 && (
        <p className="text-sm text-[var(--text-muted)]">Không tìm thấy tài liệu liên quan trong library.</p>
      )}
      <div className="flex flex-col gap-3">
        {docs?.map((doc) => (
          <Card
            key={doc.id}
            className="cursor-pointer hover:shadow-md transition-shadow p-4"
            onClick={() => navigate(`/document/${doc.id}`)}
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-[var(--text-primary)]">{doc.title}</p>
                <Badge>{doc.file_type.toUpperCase()}</Badge>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-[var(--accent)]">
                  {Math.round(doc.similarity_score * 100)}%
                </p>
                <p className="text-xs text-[var(--text-muted)]">tương đồng</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
