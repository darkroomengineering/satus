'use client'

import type {
  ISheet,
  ISheetObject,
  UnknownShorthandCompoundProps,
} from '@theatre/core'
import { useEffect, useEffectEvent, useRef, useState } from 'react'

import { useStudio } from './use-studio'

// Module scope on purpose. The React Compiler cannot lower an `import()`
// expression that sits inside a component/hook body ("BuildHIR: Handle
// Import expressions") and silently gives up on optimising the whole
// function (see `use-studio.ts`). Behind a plain function call it is just a
// call expression, so the compiler is happy and the chunk still loads
// lazily.
const loadTheatreCore = () => import('@theatre/core')

// Plain, theatre-free descriptor format for `useTheatre` configs. Call sites
// (the fluid/flowmap sims, `Group`) describe their controls with these
// instead of importing `@theatre/core` themselves — the only place that
// package's runtime is ever touched is the dynamic import below, which only
// resolves once `sheet` exists (dev only, see `useTheatreObject`). That
// keeps `@theatre/core` out of every bundle that doesn't already need it.
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

  // Serialize config to a value-stable key for the effect dependency below.
  // JSON.stringify yields an equal string for equal content even when `config`'s
  // identity changes each render, so the effect re-runs only on real changes —
  // without reading/writing refs during render (which the compiler can't track).
  const configKey = JSON.stringify(config)

  useEffect(() => {
    if (!sheet) return

    // `@theatre/core` is only ever imported here, inside the effect, and this
    // effect only runs at all once `sheet` exists — which `SheetProvider`
    // (`lib/dev/theatre/index.tsx`) only bootstraps in development. Production
    // bundles never execute this branch, so the dynamic `import()` never
    // resolves and `@theatre/core`'s chunk is never fetched (or, if the
    // bundler doesn't split it, its module code still never runs). The whole
    // hook is also removed outright by setup:project for projects that drop
    // Theatre.
    let cancelled = false
    let attached = false

    loadTheatreCore()
      .then((core) => {
        if (cancelled) return
        attached = true

        // `set-state-in-effect` fires here, and it stays. The state is what
        // makes the object observable: useTheatre's subscription effect keys
        // on it, so it has to re-run when the object appears or is rebuilt.
        // Holding it in a ref instead would leave subscribers with no signal,
        // and the object is a Theatre handle that only exists once the sheet
        // does, so it cannot be derived during render.
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
      // Only the run that actually attached an object needs to detach one —
      // a cleanup that fires before the dynamic import resolves (e.g. an
      // immediate deps change or unmount) never attached anything.
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

        // SAFETY: `object` was created by `useTheatreObject` from this same
        // `config`, so Theatre's runtime `values` always match the shape
        // `Config` was built from — Theatre's own types only know the
        // broader default `UnknownShorthandCompoundProps` shape.
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
