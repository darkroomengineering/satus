import type { ISheet } from '@theatre/core'
import type { IStudio } from '@theatre/studio'
import { useEffect, useState } from 'react'
import { useOrchestra } from '~/orchestra'

let studioPackage: IStudio

export function useStudio() {
  const [studio, setStudio] = useState(studioPackage)
  const { studio: hasStudio } = useOrchestra()

  useEffect(() => {
    if (hasStudio && !studioPackage) {
      import('@theatre/studio').then((pkg) => {
        studioPackage = pkg.default
        setStudio(pkg.default)
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
        const object = v.filter(
          ({ type }) => type === 'Theatre_SheetObject_PublicAPI'
        )[0]

        setCurrentObjectAddress(object?.address)
      })

      return unsubscribe
    }

    return undefined
  }, [studio])

  return currentObjectAddress
}
