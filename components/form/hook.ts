import {
  type ChangeEventHandler,
  type FocusEventHandler,
  type FormEvent,
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from 'react'

// TODO: Create function overloads to keep the generic nature of useActionState
type UseFormOptions = {
  action: Parameters<typeof useActionState>[0]
  initialState: Parameters<typeof useActionState>[1]
  onBlur?: boolean
  formId?: string
}

export function useForm({
  action,
  initialState,
  onBlur = false,
  formId = '',
}: UseFormOptions) {
  const [formState, formAction] = useActionState(action, initialState)
  const [isPending, startTransition] = useTransition()
  const [isActive, setIsActive] = useState([] as boolean[])
  const [isValid, setIsValid] = useState([] as boolean[])
  const [errors, setErrors] = useState(
    [] as { state: boolean; message: string }[]
  )
  const inputsRefs = useRef([] as (HTMLInputElement | null)[])

  useEffect(() => {
    if (!inputsRefs.current) return

    setIsActive(inputsRefs.current.map(() => false))
    setIsValid(inputsRefs.current.map((input) => input?.id === 'hidden'))
    setErrors(inputsRefs.current.map(() => ({ state: false, message: '' })))
  }, [])

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    formId && formData.append('formId', formId)

    startTransition(async () => {
      await formAction(formData)
    })
  }

  // React Compiler handles memoization automatically
  const setToActiveInput = (value: string, index: number) => {
    if (value.length === 0) {
      setIsActive((prev) =>
        prev.map((state, i) => (i === index ? false : state))
      )

      return
    }

    setIsActive((prev) => prev.map((state, i) => (i === index ? true : state)))
  }

  const validate = (value: string, index: number) => {
    const element = inputsRefs.current[index]
    if (!element) return

    const validate = validators[element.id]
    if (!validate) return

    const validation = value === '' ? false : validators[element.id](value)

    if (validation) {
      setIsValid((prev) =>
        prev.map((state, i) => (i === index ? validation : state))
      )
    }

    setErrors((prev) =>
      prev.map((state, i) =>
        i === index
          ? {
              state: !validation,
              message: validation ? '' : `Invalid ${element.id}`,
            }
          : state
      )
    )
  }

  function register(index: number) {
    return {
      ref: (node: HTMLInputElement | null) => {
        inputsRefs.current[index] = node
      },
      onChange: ({
        target,
      }: Parameters<ChangeEventHandler<HTMLInputElement>>[0]) => {
        setToActiveInput(target.value, index)
        if (onBlur) return
        validate(target.value, index)
      },
      onBlur: ({
        target,
      }: Parameters<FocusEventHandler<HTMLInputElement>>[0]) => {
        if (!onBlur) return
        validate(target.value, index)
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
    isReady:
      isValid.every((state) => state) && errors.every(({ state }) => !state),
    errors,
  }
}

function validatePhoneNumber(phone: string) {
  // This regular expression allows '+', numbers, spaces, and '-'.
  const re = /^[0-9+\-\s]+$/
  return re.test(String(phone))
}

function validateEmail(email: string) {
  const re =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  return re.test(String(email).toLowerCase())
}

const validators: Record<string, (value: string) => boolean> = {
  email: (value) => {
    return validateEmail(value)
  },
  phone: (value) => {
    return validatePhoneNumber(value)
  },
}
