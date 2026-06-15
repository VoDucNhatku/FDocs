import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, FileText } from 'lucide-react'
import { parsePdf } from '@/utils/pdf-parser'
import { parseDocx } from '@/utils/docx-parser'
import { documentService } from '@/services/documents'
import { useGeminiKey } from '@/context/GeminiKeyContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'

const STEPS = ['idle', 'parsing', 'uploading', 'done']

export function UploadPage() {
  const { hasKey } = useGeminiKey()
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [step, setStep] = useState('idle')
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')

  const handleFile = (f) => {
    const ext = f.name.split('.').pop().toLowerCase()
    if (!['pdf', 'docx'].includes(ext)) {
      setError('Chỉ hỗ trợ PDF hoặc DOCX')
      return
    }
    setFile(f)
    setTitle(f.name.replace(/\.[^.]+$/, ''))
    setError('')
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) return
    setError('')

    try {
      setStep('parsing')
      const ext = file.name.split('.').pop().toLowerCase()
      setProgress('Đang đọc file...')
      const parsed = ext === 'pdf' ? await parsePdf(file) : await parseDocx(file)

      setStep('uploading')
      setProgress('Đang tạo embeddings và lưu...')
      const doc = await documentService.create({
        title: title.trim() || file.name,
        file_type: ext,
        extracted_text: parsed.extractedText,
        word_count: parsed.wordCount,
        page_count: parsed.pageCount ?? null,
      })

      setStep('done')
      setTimeout(() => navigate(`/document/${doc.id}`), 800)
    } catch (err) {
      setStep('idle')
      setError(err.response?.data?.detail ?? 'Upload thất bại. Kiểm tra Gemini Key.')
    }
  }

  if (!hasKey) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 text-[var(--text-muted)]">
        <p className="text-sm">Cần có Gemini API Key để tạo embeddings khi upload.</p>
        <Button onClick={() => navigate('/settings/api-key')} variant="outline" size="sm">
          Cấu hình Key
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-6">Upload tài liệu</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--bg-surface)] py-10 cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--bg-muted)] transition-colors"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
          />
          {file ? (
            <>
              <FileText size={32} className="text-[var(--accent)]" />
              <p className="text-sm font-medium text-[var(--text-primary)]">{file.name}</p>
              <p className="text-xs text-[var(--text-muted)]">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </>
          ) : (
            <>
              <Upload size={32} className="text-[var(--text-muted)]" />
              <p className="text-sm text-[var(--text-muted)]">Kéo file vào đây hoặc click để chọn</p>
              <p className="text-xs text-[var(--text-muted)]">PDF, DOCX</p>
            </>
          )}
        </div>

        {file && (
          <Input
            placeholder="Tên tài liệu"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        {step !== 'idle' && step !== 'done' && (
          <div className="rounded-lg bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-muted)]">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
              {progress}
            </div>
            <div className="mt-2 h-1 rounded-full bg-[var(--border)] overflow-hidden">
              <div
                className="h-full bg-[var(--accent)] transition-all duration-500"
                style={{ width: step === 'parsing' ? '40%' : '85%' }}
              />
            </div>
          </div>
        )}

        {step === 'done' && (
          <p className="text-sm text-green-600 font-medium">✓ Hoàn thành — đang chuyển hướng...</p>
        )}

        <Button type="submit" disabled={!file || step !== 'idle'} loading={step !== 'idle' && step !== 'done'}>
          Xử lý tài liệu
        </Button>
      </form>
    </div>
  )
}
