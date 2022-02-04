import { animated, useSpring } from '@react-spring/web'
import cn from 'clsx'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useRef, useState } from 'react'
import s from './cursor.module.scss'

const Cursor = () => {
  const cursor = useRef()
  const [state, setState] = useState('default')
  const [isGrab, setIsGrab] = useState(false)
  const [isPointer, setIsPointer] = useState(false)
  const [hasMoved, setHasMoved] = useState(false)
  const router = useRouter()

  const [styles, api] = useSpring(() => ({
    x: 0,
    y: 0,
  }))

  const onMouseMove = useCallback(
    ({ clientX, clientY }) => {
      api.start({
        config: {
          duration: 0,
          easing: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
        },
        x: clientX,
        y: clientY,
        immediate: !hasMoved,
      })
      setHasMoved(true)
    },
    [hasMoved]
  )

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove, false)

    return () => {
      window.removeEventListener('mousemove', onMouseMove, false)
    }
  }, [hasMoved])

  useEffect(() => {
    document.documentElement.classList.add('has-custom-cursor')

    return () => {
      document.documentElement.classList.remove('has-custom-cursor')
    }
  }, [])

  useEffect(() => {
    let elements = []

    const onMouseEnter = () => {
      setIsPointer(true)
    }
    const onMouseLeave = () => {
      setIsPointer(false)
    }

    elements = [
      ...document.querySelectorAll(
        "button,a,input,label,[data-cursor='pointer']"
      ),
    ]

    elements.forEach((element) => {
      element.addEventListener('mouseenter', onMouseEnter, false)
      element.addEventListener('mouseleave', onMouseLeave, false)
    })

    return () => {
      elements.forEach((element) => {
        element.removeEventListener('mouseenter', onMouseEnter, false)
        element.removeEventListener('mouseleave', onMouseLeave, false)
      })
    }
  }, [])

  useEffect(() => {
    let elements = []

    const onMouseEnter = () => {
      setIsGrab(true)
    }
    const onMouseLeave = () => {
      setIsGrab(false)
    }

    elements = [
      ...document.querySelectorAll(
        "button,a,input,label,[data-cursor='pointer']"
      ),
    ]

    elements.forEach((element) => {
      element.addEventListener('mouseenter', onMouseEnter, false)
      element.addEventListener('mouseleave', onMouseLeave, false)
    })

    return () => {
      elements.forEach((element) => {
        element.removeEventListener('mouseenter', onMouseEnter, false)
        element.removeEventListener('mouseleave', onMouseLeave, false)
      })
    }
  }, [])

  return (
    <div
      style={{ opacity: hasMoved ? 1 : 0 }}
      className={cn(s['cursor-container'])}
    >
      <animated.div ref={cursor} style={styles}>
        <div
          className={cn(s.cursor, isGrab && s.grab, isPointer && s.pointer)}
        />
      </animated.div>
    </div>
  )
}

export { Cursor }
