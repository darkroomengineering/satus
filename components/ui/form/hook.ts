import {
  type ChangeEventHandler,
  type FocusEventHandler,
  type FormEvent,
  useActionState,
  useRef,
  useState,
  useTransition,
} from 'react'
import { emailSchema, phoneSchema, zodToValidator } from '@/utils/validation'
import type {
  FieldError,
  FormAction,
  FormState,
  UseFormOptions,
  UseFormReturn,
} from './types'

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
  const [formState, formAction] = useActionState(
    action as FormAction<unknown>,
    initialState as FormState<unknown> | null
  )
  const [isPending, startTransition] = useTransition()
  const [isActive, setIsActive] = useState<Record<string, boolean>>({})
  const [isValid, setIsValid] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, FieldError>>({})
  const inputsRefs = useRef<
    Record<string, HTMLInputElement | HTMLTextAreaElement | null>
  >({})

  // Initialize state for a field when it first registers
  function initializeInput(
    name: string,
    input: HTMLInputElement | HTMLTextAreaElement | null
  ) {
    setIsActive((prev) => ({ ...prev, [name]: false }))
    setIsValid((prev) => {
      const isHidden =
        input?.id === 'hidden' ||
        (input instanceof HTMLInputElement && input.type === 'hidden')
      return { ...prev, [name]: isHidden }
    })
    setErrors((prev) => ({
      ...prev,
      [name]: { state: false, message: '' },
    }))
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    if (formId) {
      formData.append('formId', formId)
    }

    startTransition(async () => {
      await formAction(formData)
    })
  }

  function setToActiveInput(value: string, name: string) {
    setIsActive((prev) => ({ ...prev, [name]: value.length > 0 }))
  }

  function validate(value: string, name: string) {
    const element = inputsRefs.current[name]
    if (!element) return

    const elementType =
      element instanceof HTMLInputElement ? element.type : 'textarea'
    const validator = validators[element.id] || validators[elementType]

    const isRequired = element.required
    let isValidValue: boolean

    if (validator) {
      isValidValue = value === '' ? false : validator(value)
    } else {
      isValidValue = value !== '' || !isRequired
    }

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
        }
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
    formState: formState as FormState<T> | null,
    formAction,
    onSubmit,
    register,
    isActive,
    isValid,
    isPending,
    isReady:
      Object.values(isValid).length > 0 &&
      Object.values(isValid).every(Boolean) &&
      Object.values(errors).every(({ state }) => !state),
    errors,
  }
}

// Built-in validators (uses same Zod schemas as server-side validation)
const validators: Record<string, (value: string) => boolean> = {
  email: zodToValidator(emailSchema),
  phone: zodToValidator(phoneSchema),
}

// Allow extending validators
export function addValidator(id: string, fn: (value: string) => boolean) {
  validators[id] = fn
}
