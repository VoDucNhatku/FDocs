import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { qaService } from '@/services/qa'
import { Button } from '@/components/ui/Button'

export function QAPanel({ docId }) {
  const [history, setHistory] = useState([])
  const [question, setQuestion] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamText, setStreamText] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    qaService.history(docId).then(setHistory)
  }, [docId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, streamText])

  const submit = async (e) => {
    e.preventDefault()
    const q = question.trim()
    if (!q || streaming) return
    setQuestion('')
    setStreaming(true)
    setStreamText('')

    const optimisticQ = { id: Date.now(), question: q, answer: null, sources: null }
    setHistory((h) => [...h, optimisticQ])

    let fullAnswer = ''
    const cleanup = qaService.streamAsk(
      docId,
      q,
      (token) => {
        fullAnswer += token
        setStreamText(fullAnswer)
      },
      async () => {
        setStreaming(false)
        setStreamText('')
        const updated = await qaService.history(docId)
        setHistory(updated)
        cleanup?.()
      },
    )
  }

  return (
    <div className="flex flex-col h-full gap-0">
      <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-4">
        {history.length === 0 && (
          <p className="text-sm text-[var(--text-muted)]">Hỏi bất kỳ điều gì về tài liệu này.</p>
        )}

        {history.map((item) => (
          <div key={item.id} className="flex flex-col gap-2">
            <div className="self-end max-w-[80%] rounded-xl rounded-br-sm bg-[var(--accent)] text-[var(--accent-fg)] px-4 py-2 text-sm">
              {item.question}
            </div>
            {item.answer && (
              <div className="self-start max-w-[90%] rounded-xl rounded-bl-sm bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-primary)] prose-reading leading-relaxed">
                {item.answer}
              </div>
            )}
          </div>
        ))}

        {streaming && streamText && (
          <div className="self-start max-w-[90%] rounded-xl rounded-bl-sm bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-primary)] prose-reading leading-relaxed">
            {streamText}
            <span className="inline-block w-1 h-4 bg-[var(--accent)] animate-pulse ml-0.5 align-middle" />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={submit} className="flex gap-2 pt-4 border-t border-[var(--border)]">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Đặt câu hỏi về tài liệu..."
          disabled={streaming}
          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50"
        />
        <Button type="submit" size="icon" disabled={!question.trim() || streaming}>
          <Send size={16} />
        </Button>
      </form>
    </div>
  )
}
