import api from './api'

export const documentService = {
  create: (payload) =>
    api.post('/documents', payload).then((r) => r.data),

  list: () =>
    api.get('/documents').then((r) => r.data),

  get: (id) =>
    api.get(`/documents/${id}`).then((r) => r.data),

  delete: (id) =>
    api.delete(`/documents/${id}`),
}
