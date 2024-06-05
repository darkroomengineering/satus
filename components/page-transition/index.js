'use client'

import { gsap } from 'gsap'
import { useBrowserNativeTransitions } from 'hooks/use-browser-native-transitions'
import { useEffect, useRef } from 'react'

export function PageTransition({ children }) {
  useBrowserNativeTransitions()
  const curtainRef = useRef(null)
  const pageRef = useRef(null)

  useEffect(() => {
    const animateOut = () => {
      return gsap.to(curtainRef.current, {
        y: '0%',
        duration: 0.5,
        ease: 'power2.inOut',
        onComplete: () => {
          gsap.set(pageRef.current, { opacity: 0 })
        },
      })
    }

    const animateIn = () => {
      gsap.set(pageRef.current, { opacity: 0 })
      gsap.to(curtainRef.current, {
        y: '100%',
        duration: 0.5,
        ease: 'power2.inOut',
        onComplete: () => {
          gsap.to(pageRef.current, {
            opacity: 1,
            duration: 0.5,
            ease: 'power2.inOut',
          })
        },
      })
    }

    const handleRouteChange = () => {
      animateOut().then(animateIn)
    }

    handleRouteChange()
  }, [])

  return (
    <>
      <div ref={curtainRef} style={curtainStyles} />
      <div ref={pageRef} style={pageStyles}>
        {children}
      </div>
    </>
  )
}

const curtainStyles = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  backgroundColor: '#000',
  zIndex: 9999,
  pointerEvents: 'none',
  transform: 'translateY(-100%)',
}

const pageStyles = {
  opacity: 0,
}
