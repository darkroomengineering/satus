import { useRouter } from 'next/router'
import { useMemo } from 'react'

export const useDebug = () => {
  const router = useRouter()

  const debug = useMemo(() => {
    return (
      router.asPath.includes('#debug') || process.env.NODE_ENV === 'development'
    )
  }, [router])

  return debug
}
