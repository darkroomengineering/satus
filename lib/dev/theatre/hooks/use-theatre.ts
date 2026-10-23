'use client'

import type {
  ISheet,
  ISheetObject,
  UnknownShorthandCompoundProps,
} from '@theatre/core'
import { useEffect, useEffectEvent, useRef, useState } from 'react'

import { useStudio } from './use-studio'

// Module scope on purpose: React Compiler cannot lower an `import()` inside a
// component or hook body (see `use-studio.ts`).
const loadTheatreCore = () => import('@theatre/core')

// Theatre-free descriptors: call sites describe controls with these instead of
// importing `@theatre/core`, whose runtime is only touched by the dynamic
// import in `useTheatreObject` (dev only). That keeps it out of other bundles.
export type NumberDescriptor = {
  value: number
  range?: [number, number]
  nudgeMultiplier?: number
}

type PropDescriptor = NumberDescriptor | boolean | TheatrePropDescriptors

export type TheatrePropDescriptors = {
  [key: string]: PropDescriptor
}

function isNumberDescriptor(
  descriptor: PropDescriptor
): descriptor is NumberDescriptor {
  return (
    typeof descriptor === 'object' &&
    'value' in descriptor &&
    typeof descriptor.value === 'number'
  )
}

function isBooleanDescriptor(
  descriptor: PropDescriptor
): descriptor is boolean {
  return typeof descriptor === 'boolean'
}

function toTheatreConfig(
  descriptors: TheatrePropDescriptors,
  core: Awaited<ReturnType<typeof loadTheatreCore>>
): UnknownShorthandCompoundProps {
  const config: UnknownShorthandCompoundProps = {}

  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (isBooleanDescriptor(descriptor)) {
      config[key] = descriptor
    } else if (isNumberDescriptor(descriptor)) {
      config[key] = core.types.number(descriptor.value, {
        ...(descriptor.range && { range: descriptor.range }),
        ...(descriptor.nudgeMultiplier !== undefined && {
          nudgeMultiplier: descriptor.nudgeMultiplier,
        }),
      })
    } else {
      config[key] = toTheatreConfig(descriptor, core)
    }
  }

  return config
}

export function useTheatreObject(
  sheet: ISheet | undefined,
  theatreKey: string,
  config: TheatrePropDescriptors,
  deps: unknown[] = []
) {
  const [object, setObject] = useState<ISheetObject>()

  // Value-stable effect key: `config` changes identity every render, and refs
  // can't be read or written during render (the compiler can't track them).
  const configKey = JSON.stringify(config)

  useEffect(() => {
    if (!sheet) return

    // `@theatre/core` is only imported here, and this effect runs only once
    // `sheet` exists, which `SheetProvider` bootstraps only in development.
    // setup:project removes this hook for projects that drop Theatre.
    let cancelled = false
    let attached = false

    loadTheatreCore()
      .then((core) => {
        if (cancelled) return
        attached = true

        // Deliberate set-state-in-effect: useTheatre's subscription effect keys
        // on this state to re-run when the object appears or is rebuilt. A ref
        // gives it no signal, and the handle can't be derived during render.
        // react-doctor-disable-next-line react-hooks-js/set-state-in-effect
        setObject(
          sheet.object(theatreKey, toTheatreConfig(config, core), {
            reconfigure: true,
          })
        )
      })
      .catch((error) => {
        console.error(`Theatre: failed to load core for '${theatreKey}'`, error)
      })

    return () => {
      cancelled = true
      // A cleanup that fires before the import resolves never attached anything.
      if (attached) sheet.detachObject(theatreKey)
    }
    // oxlint-disable-next-line react/exhaustive-deps -- complex dependency expression is intentional
  }, [configKey, sheet, theatreKey, ...deps])

  return object
}

type DescriptorValue<D extends PropDescriptor> = D extends NumberDescriptor
  ? number
  : D extends boolean
    ? boolean
    : D extends TheatrePropDescriptors
      ? { [K in keyof D]: DescriptorValue<D[K]> }
      : never

type TheatrePropsToValues<Config extends TheatrePropDescriptors> = {
  [K in keyof Config]: DescriptorValue<Config[K]>
}

type UseTheatreOptions<Config extends TheatrePropDescriptors> = {
  onValuesChange?: (values: TheatrePropsToValues<Config>) => void
  lazy?: boolean
  deps?: unknown[]
}

export function useTheatre<Config extends TheatrePropDescriptors>(
  sheet: ISheet | undefined,
  theatreKey: string,
  config: Config,
  { onValuesChange, lazy = true, deps = [] }: UseTheatreOptions<Config> = {}
) {
  // Wrapper because `onValuesChange` is optional; it is stable, so the
  // subscription effect doesn't re-run when the callback changes.
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

        // SAFETY: `object` was built from this same `config`, so `values` match
        // `Config`; Theatre's types only know `UnknownShorthandCompoundProps`.
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
