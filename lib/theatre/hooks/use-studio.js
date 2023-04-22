import { useBroadcastChannel } from 'hooks/use-broadcast-channel'
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
  const channel = useBroadcastChannel('studio')

  const [currentObjectAddress, setCurrentObjectAddress] = useState(null)

  useEffect(() => {
    if (studio && channel) {
      console.log(studio)
      const unsubscribe = studio.onSelectionChange((v) => {
        const object = v.filter(
          ({ type }) => type === 'Theatre_SheetObject_PublicAPI'
        )[0]

        channel.emit('onSelectionChange', {
          address: object ? JSON.stringify(object.address) : null,
        })
      })

      return unsubscribe
    }
  }, [studio, channel])

  useEffect(() => {
    if (!channel) return

    const onSelectionChange = ({ address }) => {
      setCurrentObjectAddress(address)
    }

    channel.on('onSelectionChange', onSelectionChange)

    return () => channel.off('onSelectionChange', onSelectionChange)
  }, [channel])

  return currentObjectAddress
}
