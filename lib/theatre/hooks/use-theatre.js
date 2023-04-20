import { useBroadcastChannel } from 'hooks/use-broadcast-channel'
import { useOrchestra } from 'lib/orchestra'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { debounce } from 'throttle-debounce'
import { useCurrentRafDriver } from '..'

// debounces the update of orchestra for performance reasons
let addStack = {}
let removeStack = {}

const updateOrchestra = debounce(500, () => {
  let theatreList = useOrchestra.getState().theatreList

  // remove objects from currentList
  Object.keys(removeStack).forEach((address) => {
    delete theatreList[address]
  })

  // add objects to currentList
  theatreList = {
    ...theatreList,
    ...addStack,
  }

  addStack = {}
  removeStack = {}

  useOrchestra.setState({
    theatreList,
  })
})

function addObject(address, config) {
  addStack[address] = config

  updateOrchestra()
}

function removeObject(address, config) {
  delete addStack[address]
  removeStack[address] = config

  updateOrchestra()
}

export function useTheatreObject(sheet, theatreKey, config, deps = []) {
  useEffect(() => {
    return () => {
      if (sheet?.__objects[theatreKey]) {
        sheet?.detachObject(theatreKey)
        delete sheet.__objects[theatreKey]
      }
    }
  }, [sheet])

  // since {reconfigure: true} doesn't work on production, we need to reattach the object
  const object = useMemo(() => {
    if (!sheet) return

    sheet.__objects = sheet.__objects || {}
    if (sheet.__objects[theatreKey]) {
      sheet.detachObject(theatreKey)
      delete sheet.__objects[theatreKey]
    }

    sheet.__objects[theatreKey] = true

    return sheet?.object(theatreKey, config)
  }, [sheet, theatreKey, ...deps])

  return object
}

export function useTheatre(
  sheet,
  theatreKey,
  config,
  { onValuesChange, deps = [], external = false } = {}
) {
  const object = useTheatreObject(sheet, theatreKey, config, deps)
  const rafDriver = useCurrentRafDriver()

  const lazyState = useRef({})

  const setLazyState = useCallback((value) => {
    lazyState.current = value
  }, [])
  const getLazyState = useCallback(() => lazyState.current, [])

  // this will be used as key for the object in the orchestra
  const stringifiedAddress = useMemo(
    () => JSON.stringify(object?.address),
    [object]
  )

  const channel = useBroadcastChannel('theatre' + stringifiedAddress)

  const onChange = useCallback(
    (values) => {
      setLazyState(values)
      onValuesChange?.(values)
    },
    [...deps]
  )

  useEffect(() => {
    // on studio values change, update the object
    if (object && !external && channel) {
      async function callback({ values }) {
        onChange(values)
      }

      channel.on('studio:change', callback)

      return () => channel.off('studio:change', callback)
    }
  }, [object, external, channel, onChange, ...deps])

  useEffect(() => {
    if (object) {
      const unsubscribe = object.onValuesChange(onChange, rafDriver)

      return unsubscribe
    }
  }, [object, rafDriver, onChange, ...deps])

  useEffect(() => {
    if (object && !external) {
      addObject(stringifiedAddress, config)

      return () => {
        removeObject(stringifiedAddress, config)
      }
    }
  }, [object, stringifiedAddress, external, ...deps])

  return [getLazyState, object]
}
