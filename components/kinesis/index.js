import gsap from 'gsap'
import { useCallback, useEffect, useRef } from 'react'
import { useWindowSize } from 'react-use'

export function Kinesis({ children, className, speed = 100 }) {
  const { width, height } = useWindowSize()

  const childRef = useRef()

  const onPointerMove = useCallback(
    (e) => {
      const x = (e.clientX / width - 0.5) * 2 * speed
      const y = (e.clientY / height - 0.5) * 2 * speed

      gsap.to(childRef.current, {
        x,
        y,
        duration: 1,
        ease: 'expo.out',
      })
    },
    [speed, width, height]
  )

  useEffect(() => {
    window.addEventListener('pointermove', onPointerMove, false)

    return () => {
      window.removeEventListener('pointermove', onPointerMove, false)
    }
  }, [onPointerMove])

  return (
    <div className={className}>
      <div ref={childRef}>{children}</div>
    </div>
  )
}
