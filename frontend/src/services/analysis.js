import api from './api'

export const analysisService = {
  getAll: (docId) =>
    api.get(`/documents/${docId}/analysis`).then((r) => r.data),

  summarize: (docId) =>
    api.post(`/documents/${docId}/analyze/summary`).then((r) => r.data),

  keywords: (docId) =>
    api.post(`/documents/${docId}/analyze/keywords`).then((r) => r.data),

  relevance: (docId, payload) =>
    api.post(`/documents/${docId}/analyze/relevance`, payload).then((r) => r.data),

  timePlan: (docId, payload) =>
    api.post(`/documents/${docId}/analyze/time-plan`, payload).then((r) => r.data),

  knowledgeGraph: (docId) =>
    api.post(`/documents/${docId}/analyze/knowledge-graph`).then((r) => r.data),

  related: (docId) =>
    api.get(`/documents/${docId}/related`).then((r) => r.data),
}
