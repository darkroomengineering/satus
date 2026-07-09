'use client'

import { getProject, type IProject, type ISheet, onChange } from '@theatre/core'
import {
  createContext,
  type PropsWithChildren,
  type Ref,
  use,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
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
      if (process.env.NODE_ENV === 'development') {
        console.log(`Theatre: project ${id} loaded`)
      }
    }
  }, [project, id])

  useLayoutEffect(() => {
    if (config) {
      if (!isLoadingRef.current) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`Theatre: project ${id} loading...`)
        }
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
  return use(TheatreProjectContext)
}

export const SheetContext = createContext<ISheet | undefined>(undefined)

export function useSheet(sheetId?: string, instanceId?: string) {
  const project = useCurrentProject()
  const currentSheet = use(SheetContext)

  const sheet = sheetId ? project?.sheet(sheetId, instanceId) : currentSheet

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

// Default project + checked-in state, used when `SheetProvider` finds no
// ancestor `<TheatreProjectProvider>` already in context. Both canvas mount
// strategies (shared layout canvas, per-page `<Wrapper webgl>`) render
// `<SheetProvider>` at the exact same choke point inside the r3f canvas
// component, so self-bootstrapping the project here — rather than requiring
// each canvas call site to remember to wrap one — is what actually makes
// `useSheet`/`useTheatre` resolve to a live project in both strategies.
const DEFAULT_PROJECT_ID = 'Satus-R3f'
const DEFAULT_PROJECT_CONFIG = '/config/Satus-R3f.json'

type SheetProviderProps = {
  id: ISheet['address']['sheetId'] | string | undefined
  instance?: ISheet['address']['sheetInstanceId'] | undefined
  ref?: Ref<ISheet | undefined>
}

function SheetProviderInner({
  children,
  id,
  instance,
  ref,
}: PropsWithChildren<SheetProviderProps>) {
  const sheet = useSheet(id, instance)

  useImperativeHandle(ref, () => sheet, [sheet])

  return <SheetContext.Provider value={sheet}>{children}</SheetContext.Provider>
}

export function SheetProvider({
  children,
  id,
  instance,
  ref,
}: PropsWithChildren<SheetProviderProps>) {
  const existingProject = useCurrentProject()

  // Conditional spreads: exactOptionalPropertyTypes forbids forwarding an
  // explicit `undefined` into SheetProviderInner's optional props.
  const inner = (
    <SheetProviderInner
      id={id}
      {...(instance !== undefined && { instance })}
      {...(ref !== undefined && { ref })}
    >
      {children}
    </SheetProviderInner>
  )

  // Already inside a `<TheatreProjectProvider>` (a consumer wrapped one
  // explicitly, e.g. for a non-default project) — resolve against it as-is.
  if (existingProject) return inner

  return (
    <TheatreProjectProvider
      id={DEFAULT_PROJECT_ID}
      config={DEFAULT_PROJECT_CONFIG}
    >
      {inner}
    </TheatreProjectProvider>
  )
}

export function useCurrentSheet() {
  return use(SheetContext)
}
