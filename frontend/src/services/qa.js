import api, { getAuthToken } from './api'

export const qaService = {
  ask: (docId, question) =>
    api.post(`/documents/${docId}/qa`, { question }).then((r) => r.data),

  history: (docId) =>
    api.get(`/documents/${docId}/qa`).then((r) => r.data),

  streamAsk(docId, question, onToken, onDone) {
    const geminiKey = localStorage.getItem('fdocs-gemini-key')
    let cancelled = false

    const run = async () => {
      try {
        const token = getAuthToken()
        const headers = {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        }
        if (token) headers['Authorization'] = `Bearer ${token}`
        if (geminiKey) headers['X-Gemini-Key'] = geminiKey

        const response = await fetch(`/api/documents/${docId}/qa/stream`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ question }),
        })

        if (!response.ok || !response.body) {
          onDone?.()
          return
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (!cancelled) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') {
              onDone?.()
              return
            }
            try {
              onToken(JSON.parse(data))
            } catch {
              onToken(data)
            }
          }
        }
        onDone?.()
      } catch {
        onDone?.()
      }
    }

    run()
    return () => { cancelled = true }
  },
}
