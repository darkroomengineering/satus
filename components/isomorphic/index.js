import { useEffect, useState } from 'react'

export function ClientOnly({ children }) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => setIsMounted(true), [])

  if (!isMounted) {
    return null
  }

  return children
}

export function ServerOnly({ children }) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => setIsMounted(true), [])

  if (isMounted) {
    return null
  }

  return children
}
