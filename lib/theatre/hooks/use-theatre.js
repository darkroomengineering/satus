import { useBroadcastChannel } from 'hooks/use-broadcast-channel'
import { useOrchestra } from 'lib/orchestra'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { debounce } from 'throttle-debounce'
import { useCurrentRafDriver } from '..'
import { useIsStudio, useStudioCurrentObject } from './use-studio'

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
  { onValuesChange, lazy = true, deps = [] } = {}
) {
  const object = useTheatreObject(sheet, theatreKey, config, deps)
  const rafDriver = useCurrentRafDriver()

  const lazyValuesRef = useRef({})
  const [values, setValues] = useState({})

  const setLazyValues = useCallback((value) => {
    lazyValuesRef.current = value
  }, [])
  const getLazyValues = useCallback(() => lazyValuesRef.current, [])

  const isStudio = useIsStudio()

  // this will be used as key for the object in the orchestra
  const objectAddress = useMemo(() => JSON.stringify(object?.address), [object])

  const channel = useBroadcastChannel('theatre' + objectAddress)

  const updateValues = useCallback(
    (values) => {
      setLazyValues(values)
      if (!lazy) setValues(values)

      onValuesChange?.(values)
    },
    [...deps, lazy]
  )

  useEffect(() => {
    // on studio values change, update the object
    if (object && channel) {
      function onChange({ values }) {
        updateValues(values)
      }

      channel.on('onChange', onChange)

      return () => channel.off('onChange', onChange)
    }
  }, [object, channel, updateValues, ...deps])

  useEffect(() => {
    if (object && channel) {
      const unsubscribe = object.onValuesChange((values) => {
        if (isStudio) {
          channel.emit('onChange', {
            values,
          })
        }

        updateValues(values)
      }, rafDriver)

      return unsubscribe
    }
  }, [object, channel, rafDriver, isStudio, ...deps])

  useEffect(() => {
    if (object && !isStudio) {
      addObject(objectAddress, config)

      return () => {
        removeObject(objectAddress, config)
      }
    }
  }, [object, objectAddress, isStudio, ...deps])

  const currentObjectAddress = useStudioCurrentObject()
  const isSelected = currentObjectAddress === objectAddress

  return { values, get: getLazyValues, set: setLazyValues, isSelected }
}
