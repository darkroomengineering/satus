'use client'

import { getProject, onChange } from '@theatre/core'
import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

const TheatreProjectContext = createContext()

export function TheatreProjectProvider({ children, id, config }) {
  const [project, setproject] = useState()
  const isLoadingRef = useRef(false)

  useEffect(() => {
    if (project) {
      console.log(`theatre project ${id} loaded`)
    }
  }, [project, id])

  useLayoutEffect(() => {
    if (config) {
      if (!isLoadingRef.current) {
        console.log(`theatre project ${id} loading...`)
        isLoadingRef.current = true
        fetch(config)
          .then((response) => response.json())
          .then((state) => {
            const project = getProject(id, { state })

            if (project.isReady) {
              setproject(project)
            } else {
              project.ready.then(() => {
                setproject(project)
              })
            }
          })
      }
    } else {
      const project = getProject(id)

      project.ready.then(() => {
        setproject(project)
      })
    }
  }, [config, id])

  return (
    <TheatreProjectContext.Provider value={project}>
      {children}
    </TheatreProjectContext.Provider>
  )
}

export function useCurrentProject() {
  return useContext(TheatreProjectContext)
}

export const SheetContext = createContext()

export function useSheet(id, instance) {
  const project = useCurrentProject()

  const sheet = useMemo(
    () => project?.sheet(id, instance),
    [project, id, instance],
  )

  return sheet
}

export function useSheetDuration(sheet) {
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    if (!sheet) return

    const unsubscribe = onChange(sheet.sequence.pointer.length, (duration) => {
      setDuration(duration)
    })

    return () => unsubscribe
  }, [sheet])

  return duration
}

export const SheetProvider = forwardRef(function SheetProvider(
  { children, id, instance },
  ref,
) {
  const sheet = useSheet(id, instance)

  useImperativeHandle(ref, () => sheet, [sheet])

  return <SheetContext.Provider value={sheet}>{children}</SheetContext.Provider>
})

export function useCurrentSheet() {
  return useContext(SheetContext)
}
