'use client'

import '@theatre/core'
import type { IStudio } from '@theatre/studio'
import { useEffect } from 'react'
import s from './studio.module.css'

let studio: IStudio | undefined

if (typeof window !== 'undefined') {
  studio = require('@theatre/studio').default
}

function initializeStudio() {
  if (studio) {
    studio.initialize()
    studio.ui.restore()
    console.log('Theatre: Studio initialized')
  }
}

// initializeStudio()

export function Studio() {
  useEffect(() => {
    initializeStudio()

    return () => {
      if (studio) {
        studio.ui.hide()
      }
    }
  }, [])

  return (
    <div className={s.studio}>
      <button
        type="button"
        onClick={() => {
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
