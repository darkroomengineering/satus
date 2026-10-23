import {
  type ChangeEventHandler,
  type FocusEventHandler,
  type SubmitEvent,
  useActionState,
  useRef,
  useState,
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
  const [isActive, setIsActive] = useState<Record<string, boolean>>({})
  const [isValid, setIsValid] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, FieldError>>({})
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
    setIsActive((prev) => ({ ...prev, [name]: false }))
    setIsValid((prev) => {
      const isHidden =
        input instanceof HTMLInputElement && input.type === 'hidden'
      if (isHidden || !input) {
        const isRequired = input?.required ?? false
        return { ...prev, [name]: isHidden || !isRequired }
      }
      return { ...prev, [name]: computeValidity(input.value, input) }
    })
    setErrors((prev) => ({
      ...prev,
      [name]: { state: false, message: '' },
    }))
  }

  // A blocked submit (Enter, or a click that slips through) shows errors
  // instead of silently doing nothing.
  function revealErrorsForInvalidFields() {
    setErrors((prev) => {
      const next = { ...prev }
      for (const [name, valid] of Object.entries(isValid)) {
        if (valid) continue
        const element = inputsRefs.current[name]
        const label = element?.id || element?.name || name
        next[name] = { state: true, message: `Invalid ${label}` }
      }
      return next
    })
  }

  const isReady =
    Object.values(isValid).length > 0 &&
    Object.values(isValid).every(Boolean) &&
    Object.values(errors).every(({ state }) => !state)

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
    setIsActive((prev) => ({ ...prev, [name]: value.length > 0 }))
  }

  function validate(value: string, name: string) {
    const element = inputsRefs.current[name]
    if (!element) return

    const isValidValue = computeValidity(value, element)

    setIsValid((prev) => ({ ...prev, [name]: isValidValue }))
    setErrors((prev) => ({
      ...prev,
      [name]: {
        state: !isValidValue && value !== '',
        message: isValidValue ? '' : `Invalid ${element.id || element.name}`,
      },
    }))
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
        // it needs every isValid entry true, including removed fields.
        setIsActive((prev) => {
          if (!(name in prev)) return prev
          const next = { ...prev }
          delete next[name]
          return next
        })
        setIsValid((prev) => {
          if (!(name in prev)) return prev
          const next = { ...prev }
          delete next[name]
          return next
        })
        setErrors((prev) => {
          if (!(name in prev)) return prev
          const next = { ...prev }
          delete next[name]
          return next
        })
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
