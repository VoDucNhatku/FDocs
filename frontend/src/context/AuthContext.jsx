import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { authService } from '@/services/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(null)
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    authService.refresh()
      .then((data) => {
        setAccessToken(data.access_token)
      })
      .catch(() => {})
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  const login = useCallback(async (email, password) => {
    const data = await authService.login(email, password)
    setAccessToken(data.access_token)
  }, [])

  const register = useCallback(async (email, password) => {
    const data = await authService.register(email, password)
    setAccessToken(data.access_token)
    setUser(data.user)
  }, [])

  const logout = useCallback(async () => {
    await authService.logout(accessToken)
    setAccessToken(null)
    setUser(null)
  }, [accessToken])

  const refreshToken = useCallback(async () => {
    const data = await authService.refresh()
    setAccessToken(data.access_token)
    return data.access_token
  }, [])

  return (
    <AuthContext.Provider value={{ accessToken, user, login, register, logout, refreshToken, isAuthenticated: !!accessToken, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
