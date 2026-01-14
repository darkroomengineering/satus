import {
  type ChangeEventHandler,
  type FocusEventHandler,
  type FormEvent,
  useActionState,
  useCallback,
  useRef,
  useState,
  useTransition,
} from 'react'
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
 *     <input {...register(0)} />
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
  const [isActive, setIsActive] = useState<boolean[]>([])
  const [isValid, setIsValid] = useState<boolean[]>([])
  const [errors, setErrors] = useState<FieldError[]>([])
  const inputsRefs = useRef<(HTMLInputElement | HTMLTextAreaElement | null)[]>(
    []
  )
  const registeredCount = useRef(0)

  // Initialize state for a specific input when it registers
  const initializeInput = useCallback(
    (index: number, input: HTMLInputElement | HTMLTextAreaElement | null) => {
      setIsActive((prev) => {
        const next = [...prev]
        next[index] = false
        return next
      })
      setIsValid((prev) => {
        const next = [...prev]
        // Hidden inputs are always valid, others start as invalid until validated
        const isHidden =
          input?.id === 'hidden' ||
          (input instanceof HTMLInputElement && input.type === 'hidden')
        next[index] = isHidden
        return next
      })
      setErrors((prev) => {
        const next = [...prev]
        next[index] = { state: false, message: '' }
        return next
      })
    },
    []
  )

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

  const setToActiveInput = useCallback((value: string, index: number) => {
    setIsActive((prev) => {
      const next = [...prev]
      next[index] = value.length > 0
      return next
    })
  }, [])

  const validate = useCallback((value: string, index: number) => {
    const element = inputsRefs.current[index]
    if (!element) return

    const elementType =
      element instanceof HTMLInputElement ? element.type : 'textarea'
    const validator = validators[element.id] || validators[elementType]

    // If no custom validator, field is valid if it has a value (for required) or always valid (for optional)
    const isRequired = element.required
    let isValidValue: boolean

    if (validator) {
      // Use custom validator
      isValidValue = value === '' ? false : validator(value)
    } else {
      // No custom validator - valid if has value or not required
      isValidValue = value !== '' || !isRequired
    }

    setIsValid((prev) => {
      const next = [...prev]
      next[index] = isValidValue
      return next
    })

    setErrors((prev) => {
      const next = [...prev]
      next[index] = {
        state: !isValidValue && value !== '',
        message: isValidValue ? '' : `Invalid ${element.id || element.name}`,
      }
      return next
    })
  }, [])

  const register = useCallback(
    (index: number) => ({
      ref: (node: HTMLInputElement | HTMLTextAreaElement | null) => {
        const isNewRegistration = !inputsRefs.current[index] && node
        inputsRefs.current[index] = node
        if (isNewRegistration) {
          registeredCount.current++
          initializeInput(index, node)
        }
      },
      onChange: ({
        target,
      }: Parameters<
        ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>
      >[0]) => {
        setToActiveInput(target.value, index)
        if (!onBlur) {
          validate(target.value, index)
        }
      },
      onBlur: ({
        target,
      }: Parameters<
        FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>
      >[0]) => {
        if (onBlur) {
          validate(target.value, index)
        }
      },
    }),
    [onBlur, initializeInput, setToActiveInput, validate]
  )

  return {
    formState: formState as FormState<T> | null,
    formAction,
    onSubmit,
    register,
    isActive,
    isValid,
    isPending,
    isReady: isValid.every(Boolean) && errors.every(({ state }) => !state),
    errors,
  }
}

// Built-in validators
function validatePhoneNumber(phone: string): boolean {
  const re = /^[0-9+\-\s]+$/
  return re.test(String(phone))
}

function validateEmail(email: string): boolean {
  const re =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  return re.test(String(email).toLowerCase())
}

const validators: Record<string, (value: string) => boolean> = {
  email: validateEmail,
  phone: validatePhoneNumber,
}

// Allow extending validators
export function addValidator(id: string, fn: (value: string) => boolean) {
  validators[id] = fn
}
