import { useContext, useEffect, useState } from 'react'
import { StudioContext } from '../studio/context'

let studioPackage

export function useIsStudio() {
  return useContext(StudioContext)
}

export function useStudio() {
  const [studio, setStudio] = useState(studioPackage)
  const isStudio = useIsStudio()

  useEffect(() => {
    if (isStudio && !studioPackage) {
      import('@theatre/studio').then((pkg) => {
        studioPackage = pkg.default
        setStudio(pkg.default)
      })
    }
  }, [isStudio])

  return studio
}

export function useStudioCurrentObject() {
  const studio = useStudio()

  const [currentObjectAddress, setCurrentObjectAddress] = useState(null)

  useEffect(() => {
    if (studio) {
      const unsubscribe = studio.onSelectionChange((v) => {
        const object = v.filter(
          ({ type }) => type === 'Theatre_SheetObject_PublicAPI'
        )[0]

        setCurrentObjectAddress(object.address)
      })

      return unsubscribe
    }
  }, [studio, channel])

  return currentObjectAddress
}
