import { useState } from 'react'
import { ExternalLink, Trash2, ShieldCheck } from 'lucide-react'
import { useLangPref } from '@/context/LanguagePrefContext'
import { useGeminiKey } from '@/context/GeminiKeyContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'

function maskKey(key) {
  if (!key) return ''
  if (key.length <= 8) return '•'.repeat(key.length)
  return `${key.slice(0, 4)}••••••••${key.slice(-4)}`
}

const LANG_OPTIONS = [
  { value: 'auto', label: 'Tự động', desc: 'Phát hiện ngôn ngữ từ nội dung tài liệu' },
  { value: 'vi', label: 'Tiếng Việt', desc: 'Luôn trả lời bằng tiếng Việt' },
  { value: 'en', label: 'English', desc: 'Always respond in English' },
]

function LanguageSection() {
  const { lang, setLang } = useLangPref()

  return (
    <section className="mb-8">
      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
        Ngôn ngữ phản hồi AI
      </h3>
      <p className="text-sm text-[var(--text-muted)] mb-4">
        Chọn ngôn ngữ AI dùng khi tóm tắt, phân tích và trả lời câu hỏi.
      </p>
      <Card>
        <CardContent className="pt-4 pb-2">
          <div className="flex flex-col gap-1">
            {LANG_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex items-start gap-3 rounded-lg px-3 py-3 cursor-pointer hover:bg-[var(--bg-muted)] transition-colors"
              >
                <input
                  type="radio"
                  name="lang"
                  value={opt.value}
                  checked={lang === opt.value}
                  onChange={() => setLang(opt.value)}
                  className="mt-0.5 accent-[var(--accent)]"
                />
                <div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">{opt.label}</div>
                  <div className="text-xs text-[var(--text-muted)]">{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

function ApiKeySection() {
  const { saveKey, clearKey, geminiKey, hasKey } = useGeminiKey()
  const [key, setKey] = useState(geminiKey)
  const [saved, setSaved] = useState(false)

  const handleSave = (e) => {
    e.preventDefault()
    const trimmed = key.trim()
    if (!trimmed) return
    saveKey(trimmed)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleRemove = () => {
    clearKey()
    setKey('')
    setSaved(false)
  }

  return (
    <section>
      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
        Gemini API Key
      </h3>
      <p className="text-sm text-[var(--text-muted)] mb-4">
        Key chỉ lưu trong trình duyệt, không gửi lên server của FDocs.
      </p>

      {hasKey && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-muted)] px-4 py-3 text-sm">
          <ShieldCheck size={16} className="text-[var(--success)] shrink-0" />
          <span className="text-[var(--text-muted)]">Key hiện tại:</span>
          <code className="font-mono text-[var(--text-primary)]">{maskKey(geminiKey)}</code>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <Input
              type="password"
              placeholder={hasKey ? 'Nhập key mới để thay thế' : 'AIza...'}
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
              {saved ? '✓ Đã cập nhật key' : hasKey ? 'Cập nhật Key' : 'Lưu Key'}
            </Button>
          </form>

          {hasKey && (
            <button
              type="button"
              onClick={handleRemove}
              className="mt-4 flex w-full items-center justify-center gap-1.5 text-xs text-[var(--error)] hover:underline"
            >
              <Trash2 size={12} />
              Xoá key khỏi trình duyệt
            </button>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

export function SettingsPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-8">Cài đặt</h2>
      <LanguageSection />
      <ApiKeySection />
    </div>
  )
}
