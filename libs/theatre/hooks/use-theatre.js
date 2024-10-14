import { useCallback, useEffect, useRef, useState } from 'react'
import { useStudio } from './use-studio'

export function useTheatreObject(sheet, theatreKey, config, deps = []) {
  const [object, setObject] = useState()

  useEffect(() => {
    if (!sheet) return

    setObject(sheet?.object(theatreKey, config, { reconfigure: true }))

    return () => {
      sheet.detachObject(theatreKey)
    }
  }, [JSON.stringify(config), sheet, theatreKey, ...deps])

  return object
}

export function useTheatre(
  sheet,
  theatreKey,
  config,
  { onValuesChange, lazy = true, deps = [] } = {},
) {
  const object = useTheatreObject(sheet, theatreKey, config, deps)

  const [values, setValues] = useState({})
  const lazyValues = useRef({})

  const getLazyValues = useCallback(() => lazyValues.current, [])

  useEffect(() => {
    if (object) {
      const unsubscribe = object.onValuesChange((values) => {
        lazyValues.current = values
        if (!lazy) setValues(values)

        onValuesChange?.(values)
      })

      return unsubscribe
    }
  }, [object, lazy, ...deps])

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

  return { get: getLazyValues, values, set }
}
