'use client'

import cn from 'clsx'
import { createContext, type ReactNode, use, useEffect, useState } from 'react'

import { mutate } from '@/utils/raf'

import { useForm } from './hook'
import type {
  FormAction,
  FormContextStandard,
  FormProps,
  MessagesProps,
  SubmitButtonProps,
} from './types'

import s from './form.module.css'

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
  const context = use(FormContext)
  if (!context) {
    throw new Error('useFormContext must be used within a Form')
  }
  return context
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
  // formState from useActionState survives the `key` remount below (it lives
  // in this component, not the inner <form>), so a stale success/error state
  // would otherwise persist forever after the visual reset. Dismissed on
  // every reset path and cleared again the moment a new submission starts.
  const [isDismissed, setIsDismissed] = useState(false)

  // onSuccess/onError fire from the action itself rather than from an effect
  // watching formState. The effect had to list them as dependencies, so a
  // parent re-rendering with fresh inline callbacks re-ran it and fired them a
  // second time for a submission that had already been handled. The result is
  // known right here, so there is nothing to observe after the fact.
  const actionWithCallbacks: FormAction<T> = async (prevState, formData) => {
    setIsDismissed(false)
    const result = await action(prevState, formData)

    if (result.status === 200) {
      onSuccess?.(result)
    } else if (result.status >= 400) {
      onError?.(result)
    }

    return result
  }

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
    action: actionWithCallbacks,
    ...(formId && { formId }),
    initialState: null,
  })

  // Clear the form a beat after a successful submit. Scheduling goes through
  // the rAF write queue to keep it off the layout-read path.
  //
  // `cancelled` covers unmounting before that queue drains: `resetTimer` is
  // assigned inside the queued callback, so without the flag the timer could be
  // created after teardown and setKey would fire on a component that is gone.
  useEffect(() => {
    if (formState?.status !== 200) return

    let resetTimer: ReturnType<typeof setTimeout> | undefined
    let cancelled = false

    void mutate(() => {
      if (cancelled) return
      resetTimer = setTimeout(() => {
        setKey(crypto.randomUUID())
        setIsDismissed(true)
      }, 2000)
    })

    return () => {
      cancelled = true
      if (resetTimer) clearTimeout(resetTimer)
    }
  }, [formState])

  // Reset form function for actions
  const resetForm = () => {
    setKey(crypto.randomUUID())
    setIsDismissed(true)
  }

  const contextValue: FormContextStandard = {
    state: {
      formState: isDismissed ? null : formState,
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
        {...props}
        // Internal submission control — `action`/`onSubmit` (and `key`,
        // which drives the post-submit remount) are not overridable by a
        // consumer's spread; they must win over `...props`.
        key={key}
        className={cn(s.form, className)}
        action={formAction}
        onSubmit={onSubmit}
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
  const isSuccess = formState?.status === 200
  const isError = formState?.status && formState.status >= 400

  let buttonText: ReactNode = children ?? defaultText
  if (isSuccess) {
    buttonText = successText
  } else if (isError) {
    buttonText = errorText
  } else if (isPending) {
    buttonText = pendingText
  }

  return (
    <button
      {...props}
      // Internal submission control — `type` and the disabled-gate
      // `onClick` are not overridable by a consumer's spread; they must win
      // over `...props`.
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
    ...Object.values(errors).flatMap((e) => (e.state ? [e.message] : [])),
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

// Re-export types
export type { FormState } from '@/lib/types/form'
export { useForm } from './hook'
export type {
  FormAction,
  FormContextActions,
  FormContextMeta,
  FormContextStandard,
  FormContextState,
} from './types'
