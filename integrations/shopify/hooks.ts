import { useEffect } from 'react'

export function useBeforeUnload(stop: boolean): void {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent): void => {
      if (!stop) return
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [stop])
}
