import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { useGeminiKey } from '@/context/GeminiKeyContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'

export function ApiKeySetupPage() {
  const { saveKey, geminiKey } = useGeminiKey()
  const navigate = useNavigate()
  const [key, setKey] = useState(geminiKey)
  const [saved, setSaved] = useState(false)

  const handleSave = (e) => {
    e.preventDefault()
    if (!key.trim()) return
    saveKey(key.trim())
    setSaved(true)
    setTimeout(() => navigate('/library'), 1000)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Cấu hình Gemini API Key</h2>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        FDocs dùng mô hình Gemini của bạn. Key chỉ lưu trong trình duyệt, không gửi lên server.
      </p>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <Input
              type="password"
              placeholder="AIza..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
              required
            />
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
            >
              Lấy Gemini API Key miễn phí <ExternalLink size={12} />
            </a>
            <Button type="submit" className="w-full" disabled={saved}>
              {saved ? '✓ Đã lưu — đang chuyển hướng...' : 'Lưu Key'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
