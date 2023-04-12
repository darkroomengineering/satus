import { broadcast } from 'lib/zustand-broadcast'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { useCurrentRafDriver } from '..'

export const useOrchestra = create(
  persist(
    () => ({
      theatreList: {},
    }),
    {
      name: 'orchestra', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
    }
  )
)

broadcast(useOrchestra, 'orchestra')

export function useTheatreObject(sheet, theatreKey, config, deps = []) {
  // const sheet = useCurrentSheet()

  const object = useMemo(
    () => sheet?.object(theatreKey, config, { reconfigure: true }),
    [sheet, theatreKey, JSON.stringify(config), ...deps]
  )

  return object
}

export function useTheatre(
  sheet,
  theatreKey,
  config,
  { onValuesChange, deps = [], external = false } = {}
) {
  const object = useTheatreObject(sheet, theatreKey, config, ...deps)
  const rafDriver = useCurrentRafDriver()

  const lazyState = useRef({})

  const setLazyState = (value) => {
    lazyState.current = value
  }
  const getLazyState = () => lazyState.current

  const stringifiedAddress = useMemo(
    () => JSON.stringify(object?.address),
    [object]
  )

  console.log('update')

  const onChange = useCallback((values) => {
    setLazyState(values)
    onValuesChange?.(values)
  }, [])

  useEffect(() => {
    if (object && !external) {
      const channel = new BroadcastChannel('theatre')
      channel.onmessage = ({ data }) => {
        const { address, values } = data

        if (address === stringifiedAddress) {
          onChange(values)
        }
      }

      return () => {
        channel.close()
      }
    }
  }, [object])

  useEffect(() => {
    if (object) {
      const unsubscribe = object.onValuesChange(onChange, rafDriver)

      return () => {
        unsubscribe()
      }
    }
  }, [object, stringifiedAddress, rafDriver, ...deps])

  useEffect(() => {
    if (!object || external) return

    useOrchestra.setState({
      theatreList: {
        ...useOrchestra.getState().theatreList,
        [stringifiedAddress]: JSON.stringify(config),
      },
    })
  }, [object, stringifiedAddress, config, external])

  return [getLazyState, object]
}
