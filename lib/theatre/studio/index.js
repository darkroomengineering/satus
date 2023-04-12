import studio from '@theatre/studio'
import cn from 'clsx'
import jsonminify from 'jsonminify'
import { useStore } from 'lib/store'
import { useCurrentProject, useCurrentRafDriver } from 'lib/theatre'
import { useEffect, useState } from 'react'
import s from './theatre.module.scss'

export function Studio() {
  const project = useCurrentProject()

  const [loaded, setLoaded] = useState(false)
  const [visible, setVisible] = useState(false)
  const [ui, setUI] = useState(true)
  const lenis = useStore(({ lenis }) => lenis)

  const rafDriver = useCurrentRafDriver()

  useEffect(() => {
    if (studio.__initialized) return
    studio.initialize({ __experimental_rafDriver: rafDriver }).then(() => {
      setTimeout(() => {
        setLoaded(true)
      }, 1000)
    })
    studio.__initialized = true
  }, [rafDriver])

  useEffect(() => {
    if (!loaded) return

    if (lenis) {
      lenis.options.smoothWheel = !visible
    }

    function onWheel(e) {
      e.stopPropagation()
    }

    if (visible) {
      studio.ui.restore()

      const theatreDOM = document.querySelector('#theatrejs-studio-root')
      if (theatreDOM) {
        theatreDOM.addEventListener('wheel', onWheel)

        return () => {
          theatreDOM.removeEventListener('wheel', onWheel)
        }
      }
    } else {
      studio.ui.hide()
    }
  }, [lenis, visible, loaded])

  useEffect(() => {
    const main = document.querySelector('#layout')
    if (main) {
      // main.style.visibility = ui ? 'visible' : 'hidden'
      main.style.pointerEvents = visible ? 'none' : 'all'

      return () => {
        main.style.removeProperty('pointer-events')
      }
    }
  }, [visible])

  useEffect(() => {
    const main = document.querySelector('main')
    if (main) {
      main.style.visibility = ui ? 'visible' : 'hidden'
    }
  }, [ui])

  return (
    <div className={cn(s.theatre, visible && s.visible)}>
      <button
        onClick={() => {
          setVisible((v) => !v)
        }}
        className={s.toggle}
      >
        🎭
      </button>

      <button
        onClick={() => {
          setUI((v) => !v)
        }}
        className={s.ui}
      >
        📄
      </button>

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
