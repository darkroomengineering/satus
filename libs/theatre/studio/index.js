import studio from '@theatre/studio'
import jsonminify from 'jsonminify'
import { useCurrentProject, useCurrentRafDriver } from 'libs/theatre'
import { useEffect } from 'react'
import s from './studio.module.scss'

let initialized = false

export function Studio() {
  const project = useCurrentProject()

  const rafDriver = useCurrentRafDriver()

  useEffect(() => {
    if (initialized) return

    if (rafDriver && !initialized) {
      studio.initialize({ __experimental_rafDriver: rafDriver }).then(() => {
        console.log('Studio initialized')
      })

      initialized = true
    }
  }, [rafDriver])

  useEffect(() => {
    studio.ui.restore()

    return () => {
      studio.ui.hide()
    }
  }, [])

  return (
    <div className={s.studio}>
      <button
        onClick={() => {
          // setVisible(!visible)
          const id = project.address.projectId
          const json = studio.createContentOfSaveFile(id)
          const file = new File(
            [jsonminify(JSON.stringify(json, null, 2))],
            'config.json',
            {
              type: 'application/json',
            },
          )
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
