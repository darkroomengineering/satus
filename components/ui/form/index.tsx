'use client'

import cn from 'clsx'
import { createContext, useContext, useEffect, useState } from 'react'
import { mutate } from '@/utils/raf'
import s from './form.module.css'
import { useForm } from './hook'
import type {
  FormAction,
  FormContextStandard,
  FormContextValue,
  FormProps,
  FormState,
  MessagesProps,
  SubmitButtonProps,
} from './types'

/**
 * Form component with built-in state management and server action support.
 *
 * @example
 * ```tsx
 * // Basic usage with any server action
 * async function submitAction(prevState: FormState | null, formData: FormData) {
 *   'use server'
 *   const email = formData.get('email')
 *   // Process form...
 *   return { status: 200, message: 'Success!' }
 * }
 *
 * <Form action={submitAction}>
 *   <Input id="email" type="email" label="Email" />
 *   <SubmitButton>Subscribe</SubmitButton>
 * </Form>
 * ```
 *
 * @example
 * ```tsx
 * // With success callback
 * <Form
 *   action={contactAction}
 *   onSuccess={(state) => console.log('Submitted:', state)}
 *   onError={(state) => console.log('Error:', state)}
 * >
 *   {children}
 * </Form>
 * ```
 */

// Context with standard { state, actions, meta } structure
const FormContext = createContext<FormContextStandard | null>(null)

/**
 * Hook to access the form context with standard structure.
 * Returns { state, actions, meta } for new implementations.
 *
 * @example
 * ```tsx
 * const { state, actions, meta } = useFormContext()
 * const { isPending, formState, errors } = state
 * const { register, resetForm } = actions
 * const { formId } = meta
 * ```
 */
export function useFormContext(): FormContextStandard {
  const context = useContext(FormContext)
  if (!context) {
    throw new Error('useFormContext must be used within a Form')
  }
  return context
}

/**
 * @deprecated Use useFormContext() which returns { state, actions, meta }.
 * This hook is kept for backward compatibility.
 */
export function useFormContextLegacy(): FormContextValue {
  const { state, actions } = useFormContext()
  return {
    ...state,
    register: actions.register,
  }
}

// Main Form component
export function Form<T = unknown>({
  children,
  action,
  formId,
  onSuccess,
  onError,
  className,
  ...props
}: FormProps<T>) {
  const [key, setKey] = useState<string | null>(null)

  return (
    <FormProvider
      key={key}
      setKey={setKey}
      action={action}
      formId={formId ?? ''}
      {...(onSuccess && { onSuccess })}
      {...(onError && { onError })}
      className={className ?? ''}
      {...props}
    >
      {children}
    </FormProvider>
  )
}

// Provider
type FormProviderProps<T> = FormProps<T> & {
  setKey: (key: string | null) => void
}

function FormProvider<T = unknown>({
  children,
  setKey,
  formId,
  action,
  onSuccess,
  onError,
  className,
  ...props
}: FormProviderProps<T>) {
  const {
    formAction,
    onSubmit,
    formState,
    isPending,
    isReady,
    isActive,
    isValid,
    errors,
    register,
  } = useForm({
    action: action as FormAction<unknown>,
    ...(formId && { formId }),
    initialState: null,
  })

  // Handle success/error callbacks
  useEffect(() => {
    if (!formState) return

    if (formState.status === 200) {
      onSuccess?.(formState as FormState<T>)
      // Reset form after success
      mutate(() => {
        setTimeout(() => {
          setKey(crypto.randomUUID())
        }, 2000)
      })
    } else if (formState.status >= 400) {
      onError?.(formState as FormState<T>)
    }
  }, [formState, onSuccess, onError, setKey])

  // Reset form function for actions
  const resetForm = () => {
    setKey(crypto.randomUUID())
  }

  const contextValue: FormContextStandard = {
    state: {
      formState,
      isPending,
      isReady,
      isActive,
      isValid,
      errors,
    },
    actions: {
      register,
      resetForm,
    },
    meta: {
      formId: formId ?? '',
    },
  }

  return (
    <FormContext.Provider value={contextValue}>
      <form
        className={cn(s.form, className)}
        action={formAction}
        onSubmit={onSubmit}
        {...props}
      >
        {children}
      </form>
    </FormContext.Provider>
  )
}

// Submit Button
export function SubmitButton({
  className,
  children,
  defaultText = 'Submit',
  pendingText = 'Submitting...',
  successText = 'Success!',
  errorText = 'Error',
  ...props
}: SubmitButtonProps) {
  const { state } = useFormContext()
  const { isReady, isPending, formState } = state
  const [buttonText, setButtonText] = useState(defaultText)

  const isSuccess = formState?.status === 200
  const isError = formState?.status && formState.status >= 400

  useEffect(() => {
    if (isSuccess) {
      setButtonText(successText)
    } else if (isError) {
      setButtonText(errorText)
    } else if (isPending) {
      setButtonText(pendingText)
    } else {
      setButtonText(children?.toString() ?? defaultText)
    }
  }, [
    isPending,
    isSuccess,
    isError,
    successText,
    errorText,
    pendingText,
    defaultText,
    children,
  ])

  return (
    <button
      type="submit"
      aria-disabled={!isReady || isPending}
      onClick={(e) => {
        if (!isReady || isPending) {
          e.preventDefault()
        }
      }}
      className={cn(
        className,
        s.submit,
        !isReady && s.disabled,
        isPending && s.pending,
        isSuccess && s.submitted,
        isError && s.error
      )}
      {...props}
    >
      <span>{buttonText}</span>
    </button>
  )
}

// Messages (error display)
export function Messages({ className, ...props }: MessagesProps) {
  const { state } = useFormContext()
  const { errors, formState } = state

  const allErrors = [
    ...errors.filter((e) => e.state).map((e) => e.message),
    ...(formState?.status && formState.status >= 400
      ? [formState.message]
      : []),
  ]

  if (allErrors.length === 0) return null

  return (
    <div className={cn(s.messages, className)} {...props}>
      {allErrors.map((message) => (
        <p className={cn('p-xs', s.error)} key={message}>
          {message}
        </p>
      ))}
    </div>
  )
}

export { useForm } from './hook'
// Re-export types
export type {
  FormAction,
  FormContextActions,
  FormContextMeta,
  FormContextStandard,
  FormContextState,
  FormState,
} from './types'
