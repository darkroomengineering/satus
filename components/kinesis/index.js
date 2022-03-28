import { useSpring } from '@react-spring/web'
import { useIsTouchDevice, useLayoutEffect } from '@studio-freight/hamo'
import { useRef } from 'react'
import { useWindowSize } from 'react-use'

export function Kinesis({ children, className, speed = 100 }) {
  const { width, height } = useWindowSize()
  const isTouchDevice = useIsTouchDevice()

  const childRef = useRef()

  const [_, api] = useSpring(() => ({
    x: 0,
    y: 0,
    onChange: ({ value }) => {
      childRef.current.style.transform = `translate3d(${value.x}px, ${value.y}px, 0)`
    },
  }))

  useLayoutEffect(() => {
    const onMouseMove = (e) => {
      if (isTouchDevice) return
      const x = (e.clientX / width - 0.5) * 2 * speed
      const y = (e.clientY / height - 0.5) * 2 * speed

      api.start({
        x,
        y,
      })
    }

    window.addEventListener('mousemove', onMouseMove, false)

    return () => {
      window.removeEventListener('mousemove', onMouseMove, false)
    }
  }, [speed])

  return (
    <div className={className}>
      <div ref={childRef}>{children}</div>
    </div>
  )
}
