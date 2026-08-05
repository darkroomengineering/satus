'use client'

import type {
  ISheet,
  ISheetObject,
  UnknownShorthandCompoundProps,
} from '@theatre/core'
import { useEffect, useEffectEvent, useRef, useState } from 'react'

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

  useEffect(() => {
    if (!sheet) return

    // `set-state-in-effect` fires here, and it stays. The state is what makes
    // the object observable: useTheatre's subscription effect keys on it, so it
    // has to re-run when the object appears or is rebuilt. Holding it in a ref
    // instead would leave subscribers with no signal, and the object is a
    // Theatre handle that only exists once the sheet does, so it cannot be
    // derived during render. The bailout costs auto-memoization only in
    // development: `SheetProvider` (`lib/dev/theatre/index.tsx`) only
    // bootstraps a live Theatre project when `NODE_ENV === 'development'`, so
    // `sheet` is always `undefined` in production — this effect hits the
    // early return above and the `setObject` call below never runs at all.
    // The whole hook is also removed outright by setup:project for projects
    // that drop Theatre.
    // react-doctor-disable-next-line react-hooks-js/set-state-in-effect
    setObject(sheet?.object(theatreKey, config, { reconfigure: true }))

    return () => {
      sheet.detachObject(theatreKey)
    }
    // oxlint-disable-next-line react/exhaustive-deps -- complex dependency expression is intentional
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
  // Wrapped rather than passed straight in: `onValuesChange` is optional and
  // `useEffectEvent` needs a function. The wrapper is stable, so the
  // subscription effect below never re-runs just because the callback changed.
  const handleValuesChange = useEffectEvent(
    (values: TheatrePropsToValues<Config>) => onValuesChange?.(values)
  )

  const object = useTheatreObject(sheet, theatreKey, config, deps)

  const [values, setValues] = useState({})
  const lazyValues = useRef({})

  const getLazyValues = () => lazyValues.current

  useEffect(() => {
    if (object) {
      return object.onValuesChange((values) => {
        lazyValues.current = values
        if (!lazy) setValues(values)

        handleValuesChange(values as TheatrePropsToValues<Config>)
      })
    }

    return undefined
    // oxlint-disable-next-line react/exhaustive-deps -- complex dependency expression is intentional
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
