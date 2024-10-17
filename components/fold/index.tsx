'use client'

import { useRect, useWindowSize } from '@darkroom.engineering/hamo'
import cn from 'clsx'
import {
  type HTMLAttributes,
  type ReactNode,
  createContext,
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
    start: `${rect.top} top`,
    end: `${rect.top + windowHeight} top`,
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
    start: `${rect.bottom - windowHeight} bottom`,
    end: `${rect.bottom} bottom`,
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
