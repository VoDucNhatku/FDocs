import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { GeminiKeyProvider } from '@/context/GeminiKeyContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { initApiInterceptors } from '@/services/api'
import { AuthLayout } from '@/layouts/AuthLayout'
import { AppLayout } from '@/layouts/AppLayout'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { ApiKeySetupPage } from '@/features/auth/ApiKeySetupPage'
import { LibraryPage } from '@/features/library/LibraryPage'
import { UploadPage } from '@/features/upload/UploadPage'
import { DocumentPage } from '@/features/document/DocumentPage'

function ApiInit() {
  const { accessToken, refreshToken } = useAuth()
  useEffect(() => {
    initApiInterceptors({ getToken: () => accessToken, refresh: refreshToken })
  }, [accessToken, refreshToken])
  return null
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <GeminiKeyProvider>
          <BrowserRouter>
            <ApiInit />
            <Routes>
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
              </Route>
              <Route element={<AppLayout />}>
                <Route path="/library" element={<LibraryPage />} />
                <Route path="/upload" element={<UploadPage />} />
                <Route path="/document/:docId" element={<DocumentPage />} />
                <Route path="/settings/api-key" element={<ApiKeySetupPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/library" replace />} />
            </Routes>
          </BrowserRouter>
        </GeminiKeyProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
