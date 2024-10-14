import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { useFormState } from 'react-dom'

export const useForm = ({
  action,
  initialState,
  onBlur = false,
  formId = '',
}) => {
  const [formState, formAction] = useFormState(action, initialState)
  const [isPending, startTransition] = useTransition()
  const [isActive, setIsActive] = useState([])
  const [isValid, setIsValid] = useState([])
  const [errors, setErrors] = useState([])
  const inputsRefs = useRef([])

  useEffect(() => {
    if (!inputsRefs.current) return

    setIsActive(inputsRefs.current.map(() => false))
    setIsValid(
      inputsRefs.current.map(({ id }) => (id === 'hidden' ? true : false)),
    )
    setErrors(inputsRefs.current.map(() => ({ state: false, message: '' })))
  }, [])

  function onSubmit(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    formId && formData.append('formId', formId)

    startTransition(async () => {
      await formAction(formData)
    })
  }

  const setToActiveInput = useCallback((value, index) => {
    if (value.length === 0) {
      setIsActive((prev) =>
        prev.map((state, i) => (i === index ? false : state)),
      )

      return
    }

    setIsActive((prev) => prev.map((state, i) => (i === index ? true : state)))
  }, [])

  const validate = useCallback((value, index) => {
    const element = inputsRefs.current[index]
    if (!element) return

    const validate = validators[element.id]
    if (!validate) return

    const validation = value === '' ? false : validators[element.id](value)

    if (validation) {
      setIsValid((prev) =>
        prev.map((state, i) => (i === index ? validation : state)),
      )
    }

    setErrors((prev) =>
      prev.map((state, i) =>
        i === index
          ? {
              state: !validation,
              message: validation ? '' : `Invalid ${element.id}`,
            }
          : state,
      ),
    )
  }, [])

  const register = (index) => {
    return {
      ref: (node) => {
        inputsRefs.current[index] = node
      },
      onChange: ({ target }) => {
        setToActiveInput(target.value, index)
        if (onBlur) return
        validate(target.value, index)
      },
      onBlur: ({ target }) => {
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

function validatePhoneNumber(phone) {
  // This regular expression allows '+', numbers, spaces, and '-'.
  const re = /^[0-9+\-\s]+$/
  return re.test(String(phone))
}

function validateEmail(email) {
  const re =
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  return re.test(String(email).toLowerCase())
}

const validators = {
  email: function Email(value) {
    return validateEmail(value)
  },
  phone: function Phone(value) {
    return validatePhoneNumber(value)
  },
}
