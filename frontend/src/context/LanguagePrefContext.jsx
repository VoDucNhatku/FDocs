import { createContext, useContext, useState } from 'react'

const STORAGE_KEY = 'fdocs:lang'

const LanguagePrefContext = createContext(null)

export function LanguagePrefProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem(STORAGE_KEY) || 'auto')

  const setLang = (value) => {
    localStorage.setItem(STORAGE_KEY, value)
    setLangState(value)
  }

  return (
    <LanguagePrefContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguagePrefContext.Provider>
  )
}

export function useLangPref() {
  return useContext(LanguagePrefContext)
}
