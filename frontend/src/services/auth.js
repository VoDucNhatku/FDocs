import api from './api'

export const authService = {
  register: (email, password) =>
    api.post('/auth/register', { email, password }).then((r) => r.data),

  login: (email, password) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),

  refresh: () =>
    api.post('/auth/refresh').then((r) => r.data),

  logout: () =>
    api.post('/auth/logout'),
}
