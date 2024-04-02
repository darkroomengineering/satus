import { useEffect } from 'react'

export const useBeforeUnload = (stop) => {
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!stop) return
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [stop])
}
