'use client'

import studio from '@theatre/studio'
import { useEffect } from 'react'
import s from './studio.module.css'

function initializeStudio() {
  // @ts-ignore
  studio.initialize().then(() => {
    studio.ui.restore()
    console.log('Theatre: Studio initialized')
  })
}

initializeStudio()

export function Studio() {
  useEffect(() => {
    initializeStudio()

    return () => {
      studio.ui.hide()
    }
  }, [])

  return (
    <div className={s.studio}>
      <button
        type="button"
        onClick={() => {
          const id = window.THEATRE_PROJECT_ID

          const json = studio.createContentOfSaveFile(window.THEATRE_PROJECT_ID)

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
