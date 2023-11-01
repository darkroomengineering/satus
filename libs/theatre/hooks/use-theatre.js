import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCurrentRafDriver } from '..'
import { useStudio } from './use-studio'
// @refresh reset

export function useTheatreObject(sheet, theatreKey, config, deps = []) {
  // useEffect(() => {
  //   // if (process.env.NODE_ENV !== 'development') {
  //   return () => {
  //     if (sheet?.__objects[theatreKey]) {
  //       sheet?.detachObject(theatreKey)
  //       delete sheet.__objects[theatreKey]
  //     }
  //   }
  //   // }
  // }, [sheet])

  const object = useMemo(() => {
    if (!sheet) return

    // if (process.env.NODE_ENV !== 'development') {
    sheet.__objects = sheet.__objects || {}
    if (sheet.__objects[theatreKey]) {
      sheet.detachObject(theatreKey)
      delete sheet.__objects[theatreKey]
    }

    sheet.__objects[theatreKey] = true
    // }

    return sheet?.object(theatreKey, config, { reconfigure: true })
  }, [sheet, theatreKey, ...deps])

  return object
}

export function useTheatre(
  sheet,
  theatreKey,
  config,
  { onValuesChange, lazy = true, deps = [] } = {},
) {
  const object = useTheatreObject(sheet, theatreKey, config, deps)
  const rafDriver = useCurrentRafDriver()

  const [values, setValues] = useState({})
  const lazyState = useRef({})

  const getLazyState = useCallback(() => lazyState.current, [])

  useEffect(() => {
    if (object) {
      const unsubscribe = object.onValuesChange((values) => {
        lazyState.current = values
        if (!lazy) setValues(values)

        onValuesChange?.(values)
      }, rafDriver)

      return unsubscribe
    }
  }, [object, rafDriver, lazy, ...deps])

  const studio = useStudio()

  const set = useCallback(
    (values) => {
      if (studio) {
        studio.transaction(({ set }) => {
          set(object.props, {
            ...object.value,
            ...values,
          })
        })
      }
    },
    [studio, object],
  )

  return { get: getLazyState, values, set }
}
