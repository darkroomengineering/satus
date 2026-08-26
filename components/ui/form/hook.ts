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

// Built-in validators (uses same Zod schemas as server-side validation).
// Declared above useForm so validate() can reference it without a
// use-before-define suppression. Starts empty and is populated below so the
// dictionary type stays open for `addValidator` to extend at runtime.
const validators: Record<string, (value: string) => boolean> = {}
validators.email = zodToValidator(emailSchema)
validators.phone = zodToValidator(phoneSchema)
// Registered under both the field-name convention ('phone') and the DOM
// input type used by <InputField type="tel" /> ('tel') — the type-fallback
// lookup in resolveValidator keys off `element.type`, which is "tel" for
// phone inputs, never "phone".
validators.tel = zodToValidator(phoneSchema)

// Allow extending validators
export function addValidator(id: string, fn: (value: string) => boolean) {
  validators[id] = fn
}

// Pure: resolves an input's validity the same way regardless of whether it's
// called from a live change/blur event or at registration time against a
// prefilled value. Empty values are judged by requiredness so an untouched
// optional field starts/stays valid and an untouched required field starts
// invalid; a non-empty value always goes through the validator (or, absent
// one, counts as valid).
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
  // `isPending` only updates after a render, so two submit events dispatched
  // in the same tick (double Enter before React re-renders) both read it as
  // false. This ref updates synchronously, so the second dispatch in the
  // same tick sees the lock the first one set.
  const submitLockRef = useRef(false)

  // Initialize state for a field when it first registers.
  // Hidden fields are always auto-valid. Otherwise, seed validity from the
  // element's current value (defaultValue / SSR prefill) using the same
  // computation validate() uses, so a prefilled required field starts ready
  // instead of blocking submit until the user re-types it.
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

  // Reveal errors on every currently-invalid field so a blocked submit
  // (Enter key, or a click that slips through) explains itself instead of
  // silently doing nothing.
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

    // A submission is already in flight — Enter-to-submit must respect the
    // same gate as the SubmitButton's disabled state instead of dispatching
    // a second server action while the first is still pending. The form is
    // valid, just busy, so this does not reveal errors.
    if (isPending) {
      return
    }

    // Enter-to-submit must respect the same gate as the SubmitButton.
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
      // No try/finally: React Compiler can't lower a TryStatement with a
      // finally clause. That's fine here — `formAction` is `useActionState`'s
      // dispatch, typed `() => void`; it never returns a rejectable promise,
      // so this await can't throw and skip the release below.
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

        // Unmounted (tab switch, multi-step wizard, feature flag). Leaving
        // the field's isValid/isActive/errors entries behind would wedge
        // isReady forever if this was a required field that mounted
        // untouched — isReady requires every isValid entry to be true,
        // including entries for fields that no longer exist.
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
 * Pure helper: resolves the best matching validator for a given element.
 * Exported for testing and custom form integrations.
 *
 * Priority: name → id → elementType
 */
export function resolveValidator(
  validatorMap: Record<string, (value: string) => boolean>,
  element: { name: string; id: string; type: string }
): ((value: string) => boolean) | undefined {
  const byName = element.name ? validatorMap[element.name] : undefined
  const byId = element.id ? validatorMap[element.id] : undefined
  return byName ?? byId ?? validatorMap[element.type]
}
