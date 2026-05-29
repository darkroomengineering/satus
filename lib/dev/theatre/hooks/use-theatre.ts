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

  // Serialize config to a stable string only when the object reference changes.
  // This avoids re-serializing on every render while still detecting real config changes.
  const configRef = useRef(config)
  const configKeyRef = useRef(JSON.stringify(config))
  if (configRef.current !== config) {
    const next = JSON.stringify(config)
    if (next !== configKeyRef.current) {
      configKeyRef.current = next
    }
    configRef.current = config
  }
  const configKey = configKeyRef.current

  // biome-ignore lint/correctness/useExhaustiveDependencies: deps spread is intentional
  useEffect(() => {
    if (!sheet) return

    setObject(
      sheet?.object(theatreKey, configRef.current, { reconfigure: true })
    )

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
  onValuesChangeRef.current = onValuesChange

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
