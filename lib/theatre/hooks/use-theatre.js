import { useEffect, useMemo, useRef } from 'react'
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
  onValuesChange,
  deps = []
) {
  const object = useTheatreObject(sheet, theatreKey, config, deps)
  const rafDriver = useCurrentRafDriver()

  const lazyState = useRef({})

  const setLazyState = (value) => {
    lazyState.current = value
  }
  const getLazyState = () => lazyState.current

  useEffect(() => {
    if (object) {
      const unsubscribe = object.onValuesChange((values) => {
        setLazyState(values)
        onValuesChange?.(values)
      }, rafDriver)

      return () => {
        unsubscribe()
      }
    }
  }, [object, rafDriver, ...deps])

  return [getLazyState, object]
}
