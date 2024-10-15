import '@theatre/core'
import studio from '@theatre/studio'
import { useEffect } from 'react'
import s from './studio.module.css'

let initialized = false

export function Studio() {
  useEffect(() => {
    if (initialized) return

    studio.initialize()

    initialized = true
  }, [])

  useEffect(() => {
    studio.ui.restore()

    return () => {
      studio.ui.hide()
    }
  }, [])

  return (
    <div className={s.studio}>
      <button
        type="button"
        onClick={() => {
          const project = studio.getStudioProject()
          const id = project.address.projectId
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
