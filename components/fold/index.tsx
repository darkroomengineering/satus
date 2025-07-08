'use client'

import cn from 'clsx'
import { useRect, useWindowSize } from 'hamo'
import {
  createContext,
  type HTMLAttributes,
  type ReactNode,
  useContext,
  useRef,
} from 'react'
import { useScrollTrigger } from '~/hooks/use-scroll-trigger'
import s from './fold.module.css'

const FoldContext = createContext(false)

export function useFold() {
  return useContext(FoldContext)
}

type FoldProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode
  className?: string
  type?: 'bottom' | 'top'
  disabled?: boolean
  overlay?: boolean
  parallax?: boolean
}

export function Fold({
  children,
  className,
  disabled = false,
  type = 'bottom',
  overlay = true,
  parallax = true,
  ...props
}: FoldProps) {
  const foldRef = useRef<HTMLDivElement | null>(null)
  const { height: windowHeight = 0 } = useWindowSize()
  const [setRectRef, rect] = useRect({
    // ignoreTransform: true,
    // ignoreSticky: true,
  })

  const overlayRef = useRef<HTMLDivElement>(null!)
  const stickyRef = useRef<HTMLDivElement>(null!)

  useScrollTrigger({
    start: `${rect.top ?? 0} top`,
    end: `${(rect.top ?? 0) + windowHeight} top`,
    disabled: disabled || type === 'bottom',
    onProgress: ({ progress }) => {
      if (overlayRef.current) {
        overlayRef.current.style.setProperty('--progress', String(1 - progress))
      }

      if (stickyRef.current) {
        stickyRef.current.style.setProperty('--progress', String(1 - progress))
      }
    },
  })

  useScrollTrigger({
    start: `${(rect.bottom ?? 0) - windowHeight} bottom`,
    end: `${rect.bottom ?? 0} bottom`,
    disabled: disabled || type === 'top',
    onProgress: ({ progress }) => {
      if (overlayRef.current) {
        overlayRef.current.style.setProperty('--progress', String(progress))
      }

      if (stickyRef.current) {
        stickyRef.current.style.setProperty('--progress', String(progress))
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
          className
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
