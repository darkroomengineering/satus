import {
  type ChangeEventHandler,
  type FocusEventHandler,
  type SubmitEvent,
  useActionState,
  useReducer,
  useRef,
  useTransition,
} from 'react'

import { emailSchema, phoneSchema, zodToValidator } from '@/utils/validation'

import type { FieldError, UseFormOptions, UseFormReturn } from './types'

// Built-in validators, using the same Zod schemas as the server. Declared
// above useForm so validate() can reference it without a use-before-define
// suppression; populated below so the type stays open for `addValidator`.
const validators: Record<string, (value: string) => boolean> = {}
validators.email = zodToValidator(emailSchema)
validators.phone = zodToValidator(phoneSchema)
// Registered under the field-name convention ('phone') and the DOM type
// ('tel'): resolveValidator's type fallback keys off `element.type`, which is
// "tel" for phone inputs, never "phone".
validators.tel = zodToValidator(phoneSchema)

export function addValidator(id: string, fn: (value: string) => boolean) {
  validators[id] = fn
}

// Pure, so a live change/blur and registration against a prefilled value
// resolve validity the same way. Empty values are judged by requiredness (an
// untouched optional field is valid, a required one invalid); a non-empty
// value goes through the validator, or counts as valid if there is none.
function computeValidity(
  value: string,
  element: HTMLInputElement | HTMLTextAreaElement
): boolean {
  const elementType =
    element instanceof HTMLInputElement ? element.type : 'textarea'
  const validator = resolveValidator(validators, {
    name: element.name,
    id: element.id,
    type: elementType,
  })
  const isRequired = element.required

  if (validator) {
    return value === '' ? !isRequired : validator(value)
  }
  return value !== '' || !isRequired
}

interface FieldState {
  active: boolean
  valid: boolean
  error: FieldError
}

type FieldAction =
  | { type: 'register'; name: string; valid: boolean }
  | { type: 'unregister'; name: string }
  | { type: 'change'; name: string; active: boolean }
  | { type: 'validate'; name: string; valid: boolean; error: FieldError }
  | { type: 'revealInvalid'; labels: Record<string, string> }

/**
 * Per-field state transitions for `useForm`. Pure: anything read from the DOM
 * (validity, labels) is computed by the caller and passed in the action.
 * Exported for testing.
 */
export function fieldReducer(
  state: Record<string, FieldState>,
  action: FieldAction
) {
  switch (action.type) {
    case 'register':
      return {
        ...state,
        [action.name]: {
          active: false,
          valid: action.valid,
          error: { state: false, message: '' },
        },
      }
    case 'unregister': {
      if (!(action.name in state)) return state
      const next = { ...state }
      delete next[action.name]
      return next
    }
    case 'change': {
      const field = state[action.name]
      if (!field || field.active === action.active) return state
      return { ...state, [action.name]: { ...field, active: action.active } }
    }
    case 'validate': {
      const field = state[action.name]
      if (!field) return state
      return {
        ...state,
        [action.name]: { ...field, valid: action.valid, error: action.error },
      }
    }
    case 'revealInvalid': {
      const invalid = Object.entries(state).filter(([, field]) => !field.valid)
      if (invalid.length === 0) return state
      const next = { ...state }
      for (const [name, field] of invalid) {
        next[name] = {
          ...field,
          error: {
            state: true,
            message: `Invalid ${action.labels[name] ?? name}`,
          },
        }
      }
      return next
    }
  }
}

/**
 * Form hook that integrates with React 19's useActionState for server actions.
 *
 * @example
 * ```tsx
 * const { formAction, onSubmit, register, isPending, isReady, errors } = useForm({
 *   action: myServerAction,
 * })
 *
 * return (
 *   <form action={formAction} onSubmit={onSubmit}>
 *     <input {...register('email')} name="email" />
 *     <button disabled={!isReady || isPending}>Submit</button>
 *   </form>
 * )
 * ```
 */
export function useForm<T = unknown>({
  action,
  initialState = null,
  onBlur = false,
  formId = '',
}: UseFormOptions<T>): UseFormReturn<T> {
  const [formState, formAction] = useActionState(action, initialState)
  const [isPending, startTransition] = useTransition()
  const [fields, dispatch] = useReducer(fieldReducer, {})
  const inputsRefs = useRef<
    Record<string, HTMLInputElement | HTMLTextAreaElement | null>
  >({})
  // `isPending` only updates after a render, so two submits in the same tick
  // (double Enter) both read it as false; this ref updates synchronously.
  const submitLockRef = useRef(false)

  // Hidden fields are always valid. Otherwise validity is seeded from the
  // element's current value (defaultValue / SSR prefill) via computeValidity,
  // so a prefilled required field starts ready instead of blocking submit.
  function initializeInput(
    name: string,
    input: HTMLInputElement | HTMLTextAreaElement | null
  ) {
    const isHidden =
      input instanceof HTMLInputElement && input.type === 'hidden'
    const valid =
      isHidden || !input
        ? isHidden || !(input?.required ?? false)
        : computeValidity(input.value, input)
    dispatch({ type: 'register', name, valid })
  }

  // A blocked submit (Enter, or a click that slips through) shows errors
  // instead of silently doing nothing.
  function revealErrorsForInvalidFields() {
    const labels: Record<string, string> = {}
    for (const name of Object.keys(fields)) {
      const element = inputsRefs.current[name]
      labels[name] = element?.id || element?.name || name
    }
    dispatch({ type: 'revealInvalid', labels })
  }

  const isActive: Record<string, boolean> = {}
  const isValid: Record<string, boolean> = {}
  const errors: Record<string, FieldError> = {}
  for (const [name, field] of Object.entries(fields)) {
    isActive[name] = field.active
    isValid[name] = field.valid
    errors[name] = field.error
  }

  const fieldStates = Object.values(fields)
  const isReady =
    fieldStates.length > 0 &&
    fieldStates.every(({ valid, error }) => valid && !error.state)

  const onSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (submitLockRef.current) {
      return
    }

    // Enter-to-submit respects the SubmitButton's gate. Busy but valid, so no
    // errors are revealed.
    if (isPending) {
      return
    }

    // Server-side Zod validation remains the authoritative gate either way.
    if (!isReady) {
      revealErrorsForInvalidFields()
      return
    }

    const formData = new FormData(event.currentTarget)
    if (formId) {
      formData.append('formId', formId)
    }

    submitLockRef.current = true
    startTransition(async () => {
      // No try/finally: React Compiler can't lower it. Safe here, as
      // `formAction` is `useActionState`'s dispatch (`() => void`) and never
      // rejects, so the release below can't be skipped.
      await formAction(formData)
      submitLockRef.current = false
    })
  }

  function setToActiveInput(value: string, name: string) {
    dispatch({ type: 'change', name, active: value.length > 0 })
  }

  function validate(value: string, name: string) {
    const element = inputsRefs.current[name]
    if (!element) return

    const isValidValue = computeValidity(value, element)

    dispatch({
      type: 'validate',
      name,
      valid: isValidValue,
      error: {
        state: !isValidValue && value !== '',
        message: isValidValue ? '' : `Invalid ${element.id || element.name}`,
      },
    })
  }

  function register(name: string) {
    return {
      ref: (node: HTMLInputElement | HTMLTextAreaElement | null) => {
        const isNewRegistration = !inputsRefs.current[name] && node
        inputsRefs.current[name] = node

        if (isNewRegistration) {
          initializeInput(name, node)
          return
        }

        if (node) return

        // Unmounted (tab switch, wizard, feature flag). Stale entries would
        // wedge isReady forever for a required field that mounted untouched:
        // it needs every field valid, including removed ones.
        dispatch({ type: 'unregister', name })
      },
      onChange: ({
        target,
      }: Parameters<
        ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>
      >[0]) => {
        setToActiveInput(target.value, name)
        if (!onBlur) {
          validate(target.value, name)
        }
      },
      onBlur: ({
        target,
      }: Parameters<
        FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>
      >[0]) => {
        if (onBlur) {
          validate(target.value, name)
        }
      },
    }
  }

  return {
    formState,
    formAction,
    onSubmit,
    register,
    isActive,
    isValid,
    isPending,
    isReady,
    errors,
  }
}

/**
 * Resolves the validator for an element: name, then id, then type. Exported
 * for testing and custom form integrations.
 */
export function resolveValidator(
  validatorMap: Record<string, (value: string) => boolean>,
  element: { name: string; id: string; type: string }
): ((value: string) => boolean) | undefined {
  const byName = element.name ? validatorMap[element.name] : undefined
  const byId = element.id ? validatorMap[element.id] : undefined
  return byName ?? byId ?? validatorMap[element.type]
}
