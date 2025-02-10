'use client'

import { type IProject, type ISheet, getProject, onChange } from '@theatre/core'
import {
  type PropsWithChildren,
  type Ref,
  createContext,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'

const TheatreProjectContext = createContext<IProject | undefined>(undefined)

type TheatreProjectProviderProps = {
  id: string
  config: string
}

export function TheatreProjectProvider({
  children,
  id,
  config,
}: PropsWithChildren<TheatreProjectProviderProps>) {
  const [project, setproject] = useState<IProject>()
  const isLoadingRef = useRef(false)

  useEffect(() => {
    if (project) {
      isLoadingRef.current = false
      window.THEATRE_PROJECT_ID = project.address.projectId
      console.log(`Theatre: project ${id} loaded`)
    }
  }, [project, id])

  useEffect(() => {
    if (config) {
      if (!isLoadingRef.current) {
        console.log(`Theatre: project ${id} loading...`)
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

export const SheetContext = createContext<ISheet | undefined>(undefined)

export function useSheet(sheetId: string, instanceId?: string) {
  const project = useCurrentProject()

  const sheet = useMemo(
    () => project?.sheet(sheetId, instanceId),
    [project, sheetId, instanceId]
  )

  return sheet
}

export function useSheetDuration(sheet: ISheet) {
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    if (!sheet) return

    const unsubscribe = onChange(sheet.sequence.pointer.length, (duration) => {
      setDuration(duration)
    })

    return unsubscribe
  }, [sheet])

  return duration
}

type SheetProviderProps = {
  id: string
  instance?: string
  ref?: Ref<ISheet | undefined>
}

export function SheetProvider({
  children,
  id,
  instance,
  ref,
}: PropsWithChildren<SheetProviderProps>) {
  const sheet = useSheet(id, instance)

  useImperativeHandle(ref, () => sheet, [sheet])

  return <SheetContext.Provider value={sheet}>{children}</SheetContext.Provider>
}

export function useCurrentSheet() {
  return useContext(SheetContext)
}
