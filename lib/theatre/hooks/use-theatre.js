import { useOrchestra } from 'lib/orchestra'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useCurrentRafDriver } from '..'

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
