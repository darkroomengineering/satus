'use client'

import '@theatre/core'
import type { IStudio } from '@theatre/studio'
import { useEffect, useRef } from 'react'

import s from './studio.module.css'

// Module scope on purpose. The React Compiler cannot lower an `import()`
// expression inside a component body ("BuildHIR: Handle Import expressions")
// and silently gives up on optimising the whole component. Behind a plain
// function call the chunk still loads lazily and the compiler is happy.
const loadStudio = () => import('@theatre/studio')

export function Studio() {
  const studioRef = useRef<IStudio | undefined>(undefined)

  useEffect(() => {
    let cancelled = false

    // .catch keeps no-floating-promises happy and surfaces a failed chunk
    // load instead of leaving an unhandled rejection.
    loadStudio()
      .then((mod) => {
        if (cancelled) return
        const studio = mod.default
        studioRef.current = studio
        studio.initialize()
        studio.ui.restore()
        if (process.env.NODE_ENV === 'development') {
          console.log('Theatre: Studio initialized')
        }
      })
      .catch((error) => {
        console.error('Theatre: failed to load studio', error)
      })

    return () => {
      cancelled = true
      studioRef.current?.ui.hide()
    }
  }, [])

  return (
    <div className={s.studio}>
      <button
        type="button"
        onClick={() => {
          const studio = studioRef.current
          if (!studio) return

          const id = window.THEATRE_PROJECT_ID
          if (!id) return

          const json = studio.createContentOfSaveFile(id)

          const file = new File([JSON.stringify(json)], 'config.json', {
            type: 'application/json',
          })
          const url = URL.createObjectURL(file)
          const a = document.createElement('a')
          a.href = url
          // create title using id and date up to seconds
          const title = `${id}-${new Date().toISOString().slice(0, 19)}`
          a.download = title
          a.click()
        }}
        className={s.save}
      >
        💾
      </button>
    </div>
  )
}
