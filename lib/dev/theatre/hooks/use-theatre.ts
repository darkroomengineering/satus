'use client'

import type {
  ISheet,
  ISheetObject,
  UnknownShorthandCompoundProps,
} from '@theatre/core'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useStudio } from './use-studio'

export function useTheatreObject(
  sheet: ISheet | undefined,
  theatreKey: string,
  config: UnknownShorthandCompoundProps,
  deps = [] as unknown[]
) {
  const [object, setObject] = useState<ISheetObject>()

  // biome-ignore lint/correctness/useExhaustiveDependencies: this is fine
  useEffect(() => {
    if (!sheet) return

    setObject(sheet?.object(theatreKey, config, { reconfigure: true }))

    return () => {
      sheet.detachObject(theatreKey)
    }
  }, [JSON.stringify(config), sheet, theatreKey, ...deps])

  return object
}

type TheatrePropsToValues<Config extends UnknownShorthandCompoundProps> =
  Parameters<Parameters<ISheetObject<Config>['onValuesChange']>[0]>[0]

type UseTheatreOptions<Config extends UnknownShorthandCompoundProps> = {
  onValuesChange?: (values: TheatrePropsToValues<Config>) => void
  lazy?: boolean
  deps?: unknown[]
}

export function useTheatre<Config extends UnknownShorthandCompoundProps>(
  sheet: ISheet | undefined,
  theatreKey: string,
  config: Config,
  { onValuesChange, lazy = true, deps = [] }: UseTheatreOptions<Config> = {}
) {
  const onValuesChangeRef = useRef(onValuesChange)
  onValuesChangeRef.current = onValuesChange

  const object = useTheatreObject(sheet, theatreKey, config, deps)

  const [values, setValues] = useState({})
  const lazyValues = useRef({})

  const getLazyValues = useCallback(() => lazyValues.current, [])

  useEffect(() => {
    if (object) {
      return object.onValuesChange((values) => {
        lazyValues.current = values
        if (!lazy) setValues(values)

        onValuesChangeRef.current?.(values as TheatrePropsToValues<Config>)
      })
    }

    return undefined
  }, [object, lazy, ...deps])

  const studio = useStudio()

  const set = useCallback(
    (values: NonNullable<typeof object>['props']) => {
      if (studio && object) {
        studio.transaction(({ set }) => {
          set(object.props, {
            ...object.value,
            ...values,
          })
        })
      }
    },
    [studio, object]
  )

  return { get: getLazyValues, values, set, object }
}
