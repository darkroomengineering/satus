import { useEffect, useState } from 'react'

// will render only on client side
export const ClientOnly = ({ children }) => {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => setIsMounted(true), [])

  if (!isMounted) {
    return null
  }

  return children
}

// will render only on server side
export const ServerOnly = ({ children }) => {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => setIsMounted(true), [])

  if (isMounted) {
    return null
  }

  return children
}
