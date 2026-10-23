import type { ISheet } from '@theatre/core'
import type { IStudio } from '@theatre/studio'
import { useEffect, useState } from 'react'

import { useOrchestra } from '@/lib/dev'

let studioPackage: IStudio

// Module scope on purpose: React Compiler cannot lower an `import()` inside a
// component or hook body ("BuildHIR: Handle Import expressions") and skips
// optimising the whole function.
const loadStudio = () => import('@theatre/studio')

export function useStudio() {
  const [studio, setStudio] = useState(studioPackage)
  const { studio: hasStudio } = useOrchestra()

  useEffect(() => {
    if (hasStudio && !studioPackage) {
      loadStudio()
        .then((pkg) => {
          studioPackage = pkg.default
          setStudio(pkg.default)
        })
        .catch((error) => {
          console.error('Theatre: failed to load studio', error)
        })
    }
  }, [hasStudio])

  return studio
}

export function useStudioCurrentObject() {
  const studio = useStudio()

  const [currentObjectAddress, setCurrentObjectAddress] = useState<
    ISheet['address'] | null
  >(null)

  useEffect(() => {
    if (studio) {
      const unsubscribe = studio.onSelectionChange((v) => {
        const object = v.find(
          ({ type }) => type === 'Theatre_SheetObject_PublicAPI'
        )

        setCurrentObjectAddress(object?.address ?? null)
      })

      return unsubscribe
    }

    return undefined
  }, [studio])

  return currentObjectAddress
}
