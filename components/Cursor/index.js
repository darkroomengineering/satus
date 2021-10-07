import cn from 'clsx'
import { useRouter } from 'next/router'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import s from './style.module.scss'
import { useSpring, animated } from 'react-spring'

const Cursor = () => {
  const cursor = useRef()
  const [state, setState] = useState('default')
  const [hasMoved, setHasMoved] = useState(false)
  const router = useRouter()

  const [styles, api] = useSpring(() => ({
    transform: `translate3d(0px,0px,0)`,
  }))

  const onMouseMove = useCallback(
    ({ pageX, pageY }) => {
      api.start({
        transform: `translate3d(${pageX}px,${pageY}px,0)`,
        immediate: !hasMoved,
      })
      setHasMoved(true)
    },
    [hasMoved]
  )

  useLayoutEffect(() => {
    window.addEventListener('mousemove', onMouseMove, false)

    return () => {
      window.removeEventListener('mousemove', onMouseMove, false)
    }
  }, [hasMoved])

  useLayoutEffect(() => {
    document.documentElement.classList.add('has-custom-cursor')

    return () => {
      document.documentElement.classList.remove('has-custom-cursor')
    }
  }, [])

  useLayoutEffect(() => {
    // custom cursor pointer events
    let pointerElements

    const onMouseEnter = () => {
      //   events.emit('cursor:pointer')
      setState('pointer')
    }
    const onMouseLeave = () => {
      //   events.emit('cursor:default')
      setState('default')
    }

    const onPageMount = () => {
      if (pointerElements) {
        pointerElements.forEach((element) => {
          element.removeEventListener('mouseenter', onMouseEnter, false)
          element.removeEventListener('mouseleave', onMouseLeave, false)
        })
      }

      pointerElements = [...document.querySelectorAll('button,a,input,label')]

      pointerElements.forEach((element) => {
        element.addEventListener('mouseenter', onMouseEnter, false)
        element.addEventListener('mouseleave', onMouseLeave, false)
      })
    }

    router.events.on('routeChangeComplete', onPageMount)
    onPageMount()

    // custom cursor click events
    const onMouseDown = () => {
      setState('click')
      //   events.emit('cursor:click')
    }
    const onMouseUp = () => {
      setState('default')
      //   events.emit('cursor:default')
    }

    window.addEventListener('mousedown', onMouseDown, false)
    window.addEventListener('mouseup', onMouseUp, false)

    return () => {
      window.removeEventListener('mousedown', onMouseDown, false)
      window.removeEventListener('mouseup', onMouseUp, false)
    }
  }, [])

  return (
    <div
      style={{ opacity: hasMoved ? 1 : 0 }}
      className={cn(s.appCursor, s[`appCursor--${state}`])}
    >
      <animated.div ref={cursor} style={styles}>
        <div className={s.appCursor__cursor}></div>
      </animated.div>
    </div>
  )
}

export { Cursor }
