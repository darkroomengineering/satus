import { useEffect, useState } from 'react'

export function useMediaQuery(queryString) {
  const [isMatch, setIsMatch] = useState(undefined)

  const mqChange = (mq) => {
    setIsMatch(mq.matches)
  }

  useEffect(() => {
    const mq = window.matchMedia(queryString)
    mqChange(mq)

    try {
      mq?.addEventListener('change', mqChange)
    } catch (e1) {
      try {
        mq?.addListener(mqChange)
      } catch (e2) {
        console.error(e2)
      }
    }

    return () => {
      try {
        mq?.removeEventListener('change', mqChange)
      } catch (e1) {
        try {
          mq?.removeListener(mqChange)
        } catch (e2) {
          console.error(e2)
        }
      }
    }
  })

  return isMatch
}
