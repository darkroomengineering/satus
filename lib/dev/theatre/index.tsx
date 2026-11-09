'use client'

import type { IProject, ISheet } from '@theatre/core'
import {
  createContext,
  type PropsWithChildren,
  type Ref,
  use,
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useLayoutEffect,
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

// A settled load records the `id` it belongs to; a state whose `id` differs
// from the current prop means a newer load is in flight. Loading is derived
// that way because setting it synchronously in the effect trips
// `react(set-state-in-effect)`.
type ProjectLoadState =
  | { status: 'idle' }
  | { status: 'ready'; id: string; project: IProject }
  | { status: 'failed'; id: string; error: unknown }

// Theatre fixes a project's config at the first `getProject(id, config)` call:
// a second call with another config throws in development and returns the
// first project in production. So only an `id` change starts a new load; a
// `config` change for a loaded `id` keeps that project. Use a new `id` for new
// state.
export function TheatreProjectProvider({
  children,
  id,
  config,
}: PropsWithChildren<TheatreProjectProviderProps>) {
  const [loadState, setLoadState] = useState<ProjectLoadState>({
    status: 'idle',
  })

  const loadProject = useEffectEvent(
    async (projectId: string, isStale: () => boolean) => {
      const [{ getProject }, state] = await Promise.all([
        loadTheatreCore(),
        config ? fetch(config).then((response) => response.json()) : undefined,
      ])
      // Checked before `getProject`: a superseded load must not register its
      // config with Theatre, or the current load would be rejected.
      if (isStale()) return undefined
      const project = state
        ? getProject(projectId, { state })
        : getProject(projectId)
      if (!project.isReady) await project.ready
      return project
    }
  )

  useLayoutEffect(() => {
    // Set by cleanup when `id` changes or the provider unmounts, so a
    // superseded load cannot overwrite the newer project.
    let stale = false

    if (process.env.NODE_ENV === 'development') {
      console.log(`Theatre: project ${id} loading...`)
    }

    loadProject(id, () => stale)
      .then((project) => {
        if (stale || !project) return
        window.THEATRE_PROJECT_ID = project.address.projectId
        setLoadState({ status: 'ready', id, project })
        if (process.env.NODE_ENV === 'development') {
          console.log(`Theatre: project ${id} loaded`)
        }
      })
      .catch((error) => {
        if (stale) return
        setLoadState({ status: 'failed', id, error })
        console.error(`Theatre: project ${id} failed to load`, error)
      })

    return () => {
      stale = true
    }
  }, [id])

  const project =
    loadState.status === 'ready' && loadState.id === id
      ? loadState.project
      : undefined

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
