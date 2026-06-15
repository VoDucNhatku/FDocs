import { createContext, useContext, useState } from 'react'

const STORAGE_KEY = 'fdocs-gemini-key'

const GeminiKeyContext = createContext(null)

export function GeminiKeyProvider({ children }) {
  const [geminiKey, setGeminiKeyState] = useState(() => localStorage.getItem(STORAGE_KEY) ?? '')

  const saveKey = (key) => {
    localStorage.setItem(STORAGE_KEY, key)
    setGeminiKeyState(key)
  }

  const clearKey = () => {
    localStorage.removeItem(STORAGE_KEY)
    setGeminiKeyState('')
  }

  return (
    <GeminiKeyContext.Provider value={{ geminiKey, saveKey, clearKey, hasKey: !!geminiKey }}>
      {children}
    </GeminiKeyContext.Provider>
  )
}

export function useGeminiKey() {
  return useContext(GeminiKeyContext)
}
