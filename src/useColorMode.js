import { useEffect, useState } from 'react'

const STORAGE_KEY = 'portfolio-color-mode'

export default function useColorMode() {
  const [mode, setMode] = useState(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark'
    } catch (error) {
      console.warn('Color mode preference could not be read:', error)
      return 'dark'
    }
  })

  useEffect(() => {
    document.documentElement.style.colorScheme = mode
    try {
      window.localStorage.setItem(STORAGE_KEY, mode)
    } catch (error) {
      console.warn('Color mode preference could not be saved:', error)
    }
  }, [mode])

  return [mode, () => setMode((current) => (current === 'dark' ? 'light' : 'dark'))]
}
