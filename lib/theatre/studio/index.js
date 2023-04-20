import studio from '@theatre/studio'
import { useBroadcastChannel } from 'hooks/use-broadcast-channel'
import jsonminify from 'jsonminify'
import { useCurrentProject, useCurrentRafDriver } from 'lib/theatre'
import { useEffect } from 'react'
import s from './studio.module.scss'

let initialized = false

export function Studio() {
  const project = useCurrentProject()

  const rafDriver = useCurrentRafDriver()

  useEffect(() => {
    if (initialized) return
    studio.initialize({ __experimental_rafDriver: rafDriver }).then(() => {
      studio.ui.restore()
    })
    initialized = true
  }, [rafDriver])

  const channel = useBroadcastChannel('studio')

  useEffect(() => {
    if (channel) {
      const unsubscribe = studio.onSelectionChange((v) => {
        const object = v.filter(
          ({ type }) => type === 'Theatre_SheetObject_PublicAPI'
        )[0]

        if (object) {
          channel.emit('studio:selection', {
            address: object.address,
          })
        }
      })

      return unsubscribe
    }
  }, [channel])

  return (
    <div className={s.theatre}>
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
            }
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
