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

// Module scope on purpose. The React Compiler cannot lower an `import()`
// expression that sits inside a component body ("BuildHIR: Handle Import
// expressions") and silently gives up on optimising the whole component
// (see `use-studio.ts`). Behind a plain function call it is just a call
// expression, so the compiler is happy and the chunk still loads lazily.
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
        // Fetch the checked-in state and load `@theatre/core` in parallel —
        // neither depends on the other, and this is the only place in the
        // dev-only project-bootstrap path that touches the package, so it's
        // the only place its runtime is ever pulled into a chunk.
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
            // Reset so a remount can retry — a stuck flag would silently
            // disable Theatre for the rest of the session.
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

  // The self-bootstrapped default project is dev-only: it exists so the
  // Studio editor (dev-panel-gated, see `lib/dev/theatre/studio`) has a live
  // project to bind to. Production visitors never open Studio, so skip the
  // fetch + `getProject` call entirely — `useSheet`/`useTheatre` resolve to
  // `undefined` below `inner`, which every call site already treats as "no
  // live values, use my own hard-coded defaults" (see `useTheatreObject`).
  // `process.env.NODE_ENV` is inlined at build time, so production bundles
  // dead-code-eliminate this branch rather than just skip it at runtime.
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
