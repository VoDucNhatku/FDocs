import axios from 'axios'

const api = axios.create({ baseURL: '/api', withCredentials: true })

let _getToken = null
let _refresh = null

export function initApiInterceptors({ getToken, refresh }) {
  _getToken = getToken
  _refresh = refresh
}

api.interceptors.request.use((config) => {
  const token = _getToken?.()
  if (token) config.headers.Authorization = `Bearer ${token}`

  const geminiKey = localStorage.getItem('fdocs-gemini-key')
  if (geminiKey) config.headers['X-Gemini-Key'] = geminiKey

  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retried && _refresh) {
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
