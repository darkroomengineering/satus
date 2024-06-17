'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const getCurrentHash = () =>
  typeof window !== 'undefined' ? window.location.hash.replace(/^#!?/, '') : ''

export const useHashState = () => {
  const router = useRouter()
  const params = useParams()
  const [hash, _setHash] = useState(getCurrentHash())

  const setHash = (newHash) => {
    let updatedUrl = new URL(window.location.href)
    updatedUrl.hash = `#${newHash}`

    _setHash(newHash)
    router.replace(updatedUrl.toString())
  }

  useEffect(() => {
    const currentHash = getCurrentHash()
    _setHash(currentHash)
  }, [params])

  useEffect(() => {
    const handleHashChange = () => {
      const currentHash = getCurrentHash()
      _setHash(currentHash)
    }

    window.addEventListener('hashchange', handleHashChange)

    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  return [hash, setHash]
}
