import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export function useBrowserNativeTransitions() {
  const pathname = usePathname()
  const currentPathname = useRef(pathname)

  const [currentViewTransition, setCurrentViewTransition] = useState(null)

  useEffect(() => {
    if (!('startViewTransition' in document)) {
      return () => {}
    }

    const onPopState = () => {
      let pendingViewTransitionResolve

      const pendingViewTransition = new Promise((resolve) => {
        pendingViewTransitionResolve = resolve
      })

      const pendingStartViewTransition = new Promise((resolve) => {
        document.startViewTransition(() => {
          resolve()
          return pendingViewTransition
        })
      })

      setCurrentViewTransition([
        pendingStartViewTransition,
        pendingViewTransitionResolve,
      ])
    }

    window.addEventListener('popstate', onPopState)

    return () => {
      window.removeEventListener('popstate', onPopState)
    }
  }, [])

  if (currentViewTransition && currentPathname.current !== pathname) {
    use(currentViewTransition[0])
  }

  const transitionRef = useRef(currentViewTransition)
  useEffect(() => {
    transitionRef.current = currentViewTransition
  }, [currentViewTransition])

  useEffect(() => {
    currentPathname.current = pathname
    if (transitionRef.current) {
      transitionRef.current[1]()
      transitionRef.current = null
    }
  }, [pathname])
}
