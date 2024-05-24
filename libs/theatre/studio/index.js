import '@theatre/core'
import studio from '@theatre/studio'
import { useEffect } from 'react'
import s from './studio.module.scss'

let initialized = false

export function Studio() {
  useEffect(() => {
    if (initialized) return

    studio.default.initialize().then(() => {
      console.log('Studio initialized')
    })

    initialized = true
  }, [])

  useEffect(() => {
    studio.default.ui.restore()

    return () => {
      studio.default.ui.hide()
    }
  }, [])

  return (
    <div className={s.studio}>
      <button
        onClick={() => {
          const project = studio.default.getStudioProject()
          const id = project.address.projectId
          const json = studio.default.createContentOfSaveFile(id)

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
