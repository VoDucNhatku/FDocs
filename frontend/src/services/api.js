import axios from 'axios'

const api = axios.create({ baseURL: '/api', withCredentials: true })

let _getToken = null
let _refresh = null

export function initApiInterceptors({ getToken, refresh }) {
  _getToken = getToken
  _refresh = refresh
}

export function getAuthToken() {
  return _getToken?.() ?? null
}

export function getResponseLanguageHeader() {
  const lang = localStorage.getItem('fdocs:lang') || 'auto'
  return lang !== 'auto' ? { 'X-Response-Language': lang } : {}
}

api.interceptors.request.use((config) => {
  const token = _getToken?.()
  if (token) config.headers.Authorization = `Bearer ${token}`

  const geminiKey = localStorage.getItem('fdocs-gemini-key')
  if (geminiKey) config.headers['X-Gemini-Key'] = geminiKey

  const lang = localStorage.getItem('fdocs:lang') || 'auto'
  if (lang !== 'auto') config.headers['X-Response-Language'] = lang

  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    // Only retry if the original request carried an Authorization header.
    // Requests without it (login, register, refresh) must never trigger a
    // refresh attempt — doing so causes an infinite 401 loop on login failure.
    if (
      error.response?.status === 401 &&
      !original._retried &&
      _refresh &&
      original.headers?.Authorization
    ) {
      original._retried = true
      try {
        const newToken = await _refresh()
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export default api
