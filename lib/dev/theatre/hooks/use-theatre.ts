'use client'

import type {
  ISheet,
  ISheetObject,
  UnknownShorthandCompoundProps,
} from '@theatre/core'
import { useEffect, useRef, useState } from 'react'
import { useStudio } from './use-studio'

export function useTheatreObject(
  sheet: ISheet | undefined,
  theatreKey: string,
  config: UnknownShorthandCompoundProps,
  deps = [] as unknown[]
) {
  const [object, setObject] = useState<ISheetObject>()

  // Serialize config to a value-stable key for the effect dependency below.
  // JSON.stringify yields an equal string for equal content even when `config`'s
  // identity changes each render, so the effect re-runs only on real changes —
  // without reading/writing refs during render (which the compiler can't track).
  const configKey = JSON.stringify(config)

  // biome-ignore lint/correctness/useExhaustiveDependencies: deps spread is intentional
  useEffect(() => {
    if (!sheet) return

    setObject(sheet?.object(theatreKey, config, { reconfigure: true }))

    return () => {
      sheet.detachObject(theatreKey)
    }
  }, [configKey, sheet, theatreKey, ...deps])

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
  useEffect(() => {
    onValuesChangeRef.current = onValuesChange
  })

  const object = useTheatreObject(sheet, theatreKey, config, deps)

  const [values, setValues] = useState({})
  const lazyValues = useRef({})

  const getLazyValues = () => lazyValues.current

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

  const set = (values: NonNullable<typeof object>['props']) => {
    if (studio && object) {
      studio.transaction(({ set }) => {
        set(object.props, {
          ...object.value,
          ...values,
        })
      })
    }
  }

  return { get: getLazyValues, values, set, object }
}
