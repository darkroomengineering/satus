'use client'

import { useRect, useWindowSize } from '@darkroom.engineering/hamo'
import cn from 'clsx'
import { useScrollTrigger } from 'hooks/use-scroll-trigger'
import PropTypes from 'prop-types'
import { createContext, useContext, useRef } from 'react'
import s from './fold.module.scss'

const FoldContext = createContext(false)

export function useFold() {
  return useContext(FoldContext)
}

export function Fold({
  children,
  className,
  disabled = false,
  type = 'bottom',
  overlay = true,
  parallax = true,
  ...props
}) {
  const foldRef = useRef()
  const { height: windowHeight } = useWindowSize()
  const [setRectRef, rect] = useRect({
    // ignoreTransform: true,
    // ignoreSticky: true,
  })

  const overlayRef = useRef()
  const stickyRef = useRef()

  useScrollTrigger({
    start: `${rect.top} top`,
    end: `${rect.top + windowHeight} top`,
    disabled: disabled || type === 'bottom',
    onProgress: ({ progress }) => {
      if (overlayRef.current) {
        overlayRef.current.style.setProperty('--progress', 1 - progress)
      }

      if (stickyRef.current) {
        stickyRef.current.style.setProperty('--progress', 1 - progress)
      }
    },
  })

  useScrollTrigger({
    start: `${rect.bottom - windowHeight} bottom`,
    end: `${rect.bottom} bottom`,
    disabled: disabled || type === 'top',
    onProgress: ({ progress }) => {
      if (overlayRef.current) {
        overlayRef.current.style.setProperty('--progress', progress)
      }

      if (stickyRef.current) {
        stickyRef.current.style.setProperty('--progress', progress)
      }
    },
  })

  return (
    // <TransformProvider ref={transformProviderRef}>
    <FoldContext.Provider value={true}>
      <div
        ref={(node) => {
          foldRef.current = node
          setRectRef(node)
        }}
        className={cn(
          s.fold,
          disabled && s.isDisabled,
          type === 'bottom' && s.isBottom,
          type === 'top' && s.isTop,
          overlay && s.isOverlay,
          parallax && s.isParallax,
          className,
        )}
        {...props}
      >
        <div className={cn(s.sticky)} ref={stickyRef}>
          {children}
        </div>
        <div className={s.overlay} ref={overlayRef} />
      </div>
    </FoldContext.Provider>
    // </TransformProvider>
  )
}

Fold.propTypes = {
  children: PropTypes.node.isRequired,
  disabled: PropTypes.bool,
  type: PropTypes.oneOf(['top', 'bottom']),
  overlay: PropTypes.bool,
  parallax: PropTypes.bool,
}

// Fold.defaultProps = {
//   disabled: false,
//   type: 'bottom',
//   overlay: true,
//   parallax: true,
// }
