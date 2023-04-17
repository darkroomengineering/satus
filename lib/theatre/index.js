import { useFrame } from '@studio-freight/hamo'
import { createRafDriver, getProject } from '@theatre/core'
import { useImmutableState } from 'hooks/use-immutable-state'
import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react'

const RafDriverContext = createContext()

export function RafDriverProvider({ children, id = 'default' }) {
  const theatreRaf = useImmutableState(createRafDriver({ name: id }))

  useFrame((time) => {
    theatreRaf.tick(time)
  })

  return (
    <RafDriverContext.Provider value={theatreRaf}>
      {children}
    </RafDriverContext.Provider>
  )
}

export function useCurrentRafDriver() {
  return useContext(RafDriverContext)
}

const ProjectContext = createContext()

export function ProjectProvider({ children, id, config }) {
  const [project, setproject] = useState()

  useEffect(() => {
    if (config) {
      fetch(config)
        .then((response) => response.json())
        .then((state) => {
          const project = getProject(id, { state })

          project.ready.then(() => {
            setproject(project)
          })
        })
    } else {
      const project = getProject(id)

      project.ready.then(() => {
        setproject(project)
      })
    }
  }, [config, id])

  return (
    <ProjectContext.Provider value={project}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useCurrentProject() {
  return useContext(ProjectContext)
}

const SheetContext = createContext()

export function useSheet(id, instance) {
  const project = useCurrentProject()

  const sheet = useMemo(
    () => project?.sheet(id, instance),
    [project, id, instance]
  )

  return sheet
}

export const SheetProvider = forwardRef(function SheetProvider(
  { children, id, instance },
  ref
) {
  const sheet = useSheet(id, instance)

  useImperativeHandle(ref, () => sheet, [sheet])

  return <SheetContext.Provider value={sheet}>{children}</SheetContext.Provider>
})

export function useCurrentSheet() {
  return useContext(SheetContext)
}
