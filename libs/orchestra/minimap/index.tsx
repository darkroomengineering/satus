'use client'

import { useWindowSize } from 'hamo'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useTempus } from 'tempus/react'
import { create } from 'zustand'
import s from './minimap.module.css'

type MinimapEntry = {
  element: HTMLElement
  color: string
}

type MinimapStore = {
  list: Record<string, MinimapEntry>
}

const useMinimapStore = create<MinimapStore>(() => ({
  list: {},
}))

export function useMinimap({ color = 'blue' } = {}) {
  const [element, setElement] = useState<HTMLElement | null>()
  const id = useId()

  useEffect(() => {
    if (!element) return

    // list.set(id, element)
    useMinimapStore.setState((state) => ({
      list: {
        ...state.list,
        [id]: { element, color },
      },
    }))
    return () => {
      useMinimapStore.setState((state) => {
        const list = { ...state.list }
        delete list[id]
        return { list }
      })

      // list.delete(id, element)
    }
  }, [id, element, color])

  return setElement
}

export function Minimap() {
  const [aspectRatio, setAspectRatio] = useState('1')

  useEffect(() => {
    const resizeObserver = new ResizeObserver(([entry]) => {
      const aspectRatio = entry.contentRect.width / entry.contentRect.height

      setAspectRatio(aspectRatio.toFixed(2))
    })

    resizeObserver.observe(document.body)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  const elementRef = useRef<HTMLDivElement>(null!)

  const onScroll = useCallback(() => {
    const progress =
      window.scrollY /
      (document.documentElement.scrollHeight - window.innerHeight)

    elementRef.current.style.setProperty('--progress', progress.toString())
  }, [])

  useEffect(() => {
    window.addEventListener('scroll', onScroll)

    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [onScroll])

  const { width = 0, height = 0 } = useWindowSize()

  const list = useMinimapStore((state) => state.list)

  return (
    <div
      ref={elementRef}
      style={{
        '--viewport-ratio': width / height,
        '--body-ratio': aspectRatio,
      }}
      className={s.minimap}
    >
      <div className={s.body} />
      <div className={s.markers}>
        {Object.entries(list).map(([key, { element, color }]) => (
          <Marker key={key} element={element} color={color} />
        ))}
      </div>
    </div>
  )
}

function Marker({ element, color }: MinimapEntry) {
  const markerRef = useRef<HTMLDivElement>(null!)

  useTempus(() => {
    if (!element) return

    if (!markerRef.current) return

    // console.log(element)
    const rect = element.getBoundingClientRect()
    const top = rect.top / window.innerHeight
    // const height = rect.height / document.documentElement.scrollHeight
    const left = rect.left / window.innerWidth
    const width = rect.width / window.innerWidth

    // markerRef.current.style.top = `${top * 100}%`
    markerRef.current.style.setProperty('--top', top.toString())
    // markerRef.current.style.height = `${height * 100}%`
    markerRef.current.style.left = `${left * 100}%`
    markerRef.current.style.width = `${width * 100}%`
  })

  return (
    <div
      ref={markerRef}
      className={s.marker}
      style={{
        backgroundColor: color,
      }}
    />
  )
}
