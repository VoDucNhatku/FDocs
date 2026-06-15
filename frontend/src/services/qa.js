import api from './api'

export const qaService = {
  ask: (docId, question) =>
    api.post(`/documents/${docId}/qa`, { question }).then((r) => r.data),

  history: (docId) =>
    api.get(`/documents/${docId}/qa`).then((r) => r.data),

  streamAsk(docId, question, onToken, onDone) {
    const token = localStorage.getItem('fdocs-access-token')
    const geminiKey = localStorage.getItem('fdocs-gemini-key')
    const url = `/api/documents/${docId}/qa/stream?question=${encodeURIComponent(question)}`
    const source = new EventSource(url)

    source.onmessage = (e) => {
      if (e.data === '[DONE]') {
        source.close()
        onDone?.()
      } else {
        onToken(e.data)
      }
    }
    source.onerror = () => {
      source.close()
      onDone?.()
    }
    return () => source.close()
  },
}
