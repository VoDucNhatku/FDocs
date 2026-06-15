import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, FileType, Trash2, Plus } from 'lucide-react'
import { documentService } from '@/services/documents'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'

export function LibraryPage() {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    documentService.list()
      .then(setDocs)
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Xóa tài liệu này?')) return
    await documentService.delete(id)
    setDocs((prev) => prev.filter((d) => d.id !== id))
  }

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <Spinner size="lg" />
    </div>
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Library</h1>
        <Button onClick={() => navigate('/upload')} size="sm">
          <Plus size={16} /> Upload
        </Button>
      </div>

      {docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-[var(--text-muted)]">
          <FileText size={40} className="mb-3 opacity-40" />
          <p className="text-sm">Chưa có tài liệu nào. Upload tài liệu đầu tiên.</p>
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {docs.map((doc) => (
            <Card
              key={doc.id}
              className="cursor-pointer hover:shadow-md transition-shadow group"
              onClick={() => navigate(`/document/${doc.id}`)}
            >
              <div className="p-4 flex items-start justify-between gap-3">
                <div className="flex gap-3 min-w-0">
                  <FileType size={20} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-[var(--text-primary)] truncate">{doc.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge>{doc.file_type.toUpperCase()}</Badge>
                      {doc.word_count && (
                        <span className="text-xs text-[var(--text-muted)]">
                          {(doc.word_count / 1000).toFixed(1)}k từ
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      {new Date(doc.created_at).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(doc.id, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* [DESIGN PENDING] Similarity Map view toggle */}
    </div>
  )
}
