import { useEffect } from 'react'

export function useTimeout(callback: () => void, delay: number) {
  useEffect(() => {
    const timeout = setTimeout(callback, delay)

    return () => {
      clearTimeout(timeout)
    }
  }, [callback, delay])
}
