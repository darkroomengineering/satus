'use client'

import type { IProject, ISheet } from '@theatre/core'
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

// Module scope on purpose: React Compiler cannot lower an `import()` inside a
// component body (see `use-studio.ts`).
const loadTheatreCore = () => import('@theatre/core')

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
        void Promise.all([
          loadTheatreCore(),
          fetch(config).then((response) => response.json()),
        ])
          .then(([{ getProject }, state]) => {
            const project = getProject(id, { state })

            if (project.isReady) {
              setproject(project)
            } else {
              void project.ready.then(() => {
                setproject(project)
              })
            }
          })
          .catch((error) => {
            // Reset so a remount can retry; a stuck flag disables Theatre for the session.
            isLoadingRef.current = false
            console.error(`Theatre: project ${id} failed to load`, error)
          })
      }
    } else {
      loadTheatreCore()
        .then(({ getProject }) => {
          const project = getProject(id)

          void project.ready.then(() => {
            setproject(project)
          })
        })
        .catch((error) => {
          console.error(`Theatre: project ${id} failed to load`, error)
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

    let cancelled = false
    let unsubscribe: (() => void) | undefined

    loadTheatreCore()
      .then(({ onChange }) => {
        if (cancelled) return
        unsubscribe = onChange(sheet.sequence.pointer.length, (duration) => {
          setDuration(duration)
        })
      })
      .catch((error) => {
        console.error('Theatre: failed to load core for sheet duration', error)
      })

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [sheet])

  return duration
}

// Used when `SheetProvider` finds no ancestor `<TheatreProjectProvider>`. Both
// canvas mount strategies (layout root canvas, per-page `<Wrapper webgl>`)
// render `<SheetProvider>` at one choke point inside the r3f canvas, so
// bootstrapping here makes `useSheet`/`useTheatre` live in both.
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

  // Conditional spreads: exactOptionalPropertyTypes forbids forwarding `undefined`.
  const inner = (
    <SheetProviderInner
      id={id}
      {...(instance !== undefined && { instance })}
      {...(ref !== undefined && { ref })}
    >
      {children}
    </SheetProviderInner>
  )

  if (existingProject) return inner

  // The default project exists only so Studio has a live project to bind to.
  // In production `useSheet`/`useTheatre` resolve to `undefined`, which every
  // call site treats as "use my hard-coded defaults". NODE_ENV is inlined at
  // build time, so the branch below is dead-code-eliminated.
  if (process.env.NODE_ENV !== 'development') return inner

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
