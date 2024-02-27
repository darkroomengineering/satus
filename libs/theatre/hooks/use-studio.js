import { useOrchestra } from 'libs/orchestra/react'
import { useEffect, useState } from 'react'

let studioPackage

export function useHasStudio() {
  const { studio } = useOrchestra()
  return studio
}

export function useStudio() {
  const [studio, setStudio] = useState(studioPackage)
  const hasStudio = useHasStudio()

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

  const [currentObjectAddress, setCurrentObjectAddress] = useState(null)

  useEffect(() => {
    if (studio) {
      const unsubscribe = studio.onSelectionChange((v) => {
        const object = v.filter(
          ({ type }) => type === 'Theatre_SheetObject_PublicAPI',
        )[0]

        setCurrentObjectAddress(object.address)
      })

      return unsubscribe
    }
  }, [studio])

  return currentObjectAddress
}
