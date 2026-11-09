'use client'

import cn from 'clsx'
import {
  createContext,
  type ReactNode,
  use,
  useEffect,
  useReducer,
} from 'react'

import type { FormState } from '@/lib/types/form'
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

const FormContext = createContext<FormContextStandard | null>(null)

/** Access the form context: `{ state, actions, meta }`. */
export function useFormContext(): FormContextStandard {
  const context = use(FormContext)
  if (!context) {
    throw new Error('useFormContext must be used within a Form')
  }
  return context
}

// The submit lifecycle. The result an attempt settled with lives here, not in
// useForm's `formState`: that one keeps the previous attempt's result while
// the next is pending, and survives a reset. Only `succeeded` and `failed`
// expose a result, so a retry shows its pending state, never the last outcome.
// `dismissed` is a result the visitor or the auto-reset cleared. `key`
// remounts the inner <form> on a reset.
type SubmitLifecycle =
  | { phase: 'idle' | 'pending' | 'dismissed'; key: string | null }
  | { phase: 'succeeded' | 'failed'; key: string | null; result: FormState }

type SubmitLifecycleAction =
  | { type: 'submitStarted' }
  | { type: 'settled'; result: FormState }
  | { type: 'autoReset'; key: string }
  | { type: 'manualReset'; key: string }
  | { type: 'userEdited' }

/** Exported for testing. */
export function submitLifecycleReducer(
  state: SubmitLifecycle,
  action: SubmitLifecycleAction
): SubmitLifecycle {
  switch (action.type) {
    case 'submitStarted':
      return { phase: 'pending', key: state.key }
    case 'settled': {
      const { result } = action
      if (result.status === 200) {
        return { phase: 'succeeded', key: state.key, result }
      }
      if (result.status >= 400) {
        return { phase: 'failed', key: state.key, result }
      }
      // Any other status shows neither the success nor the error state.
      return { phase: 'idle', key: state.key }
    }
    case 'autoReset':
      if (state.phase !== 'succeeded') return state
      return { phase: 'dismissed', key: action.key }
    case 'manualReset':
      return { phase: 'dismissed', key: action.key }
    case 'userEdited':
      // Typing while a result shows keeps the input: dismiss it without a
      // remount, which also cancels a pending auto-reset and makes a failed
      // form submittable again. A no-op otherwise, so per-keystroke dispatches
      // never re-render.
      if (state.phase !== 'succeeded' && state.phase !== 'failed') return state
      return { phase: 'dismissed', key: state.key }
  }
}

export function Form<T = unknown>({
  children,
  action,
  formId,
  onSuccess,
  onError,
  className,
  onInput,
  ...props
}: FormProps<T>) {
  const [lifecycle, dispatch] = useReducer(submitLifecycleReducer, {
    phase: 'idle',
    key: null,
  })

  // onSuccess/onError fire from the action, not from an effect watching
  // formState: such an effect would depend on them, and a parent re-rendering
  // with fresh inline callbacks would re-fire them for a handled submission.
  const actionWithCallbacks: FormAction<T> = async (prevState, formData) => {
    const result = await action(prevState, formData)
    dispatch({ type: 'settled', result })

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
    onSubmitStart: () => dispatch({ type: 'submitStarted' }),
  })

  // Scheduled through the rAF write queue, off the layout-read path.
  // `cancelled` covers unmounting before the queue drains: `resetTimer` is
  // assigned inside the queued callback, so without the flag the timer could
  // be created after teardown and dispatch on an unmounted component. Keyed on
  // the lifecycle object, not its phase: every `succeeded` dispatch yields a
  // new object, so a second success inside the window re-arms the timer, while
  // leaving `succeeded` (userEdited, manualReset) clears it.
  useEffect(() => {
    if (lifecycle.phase !== 'succeeded') return

    let resetTimer: ReturnType<typeof setTimeout> | undefined
    let cancelled = false

    void mutate(() => {
      if (cancelled) return
      resetTimer = setTimeout(() => {
        dispatch({ type: 'autoReset', key: crypto.randomUUID() })
      }, 2000)
    })

    return () => {
      cancelled = true
      if (resetTimer) clearTimeout(resetTimer)
    }
  }, [lifecycle])

  const resetForm = () => {
    dispatch({ type: 'manualReset', key: crypto.randomUUID() })
  }

  const contextValue: FormContextStandard = {
    state: {
      formState:
        lifecycle.phase === 'succeeded' || lifecycle.phase === 'failed'
          ? lifecycle.result
          : null,
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
        // `key` (the post-submit remount) goes before the spread for the JSX
        // runtime; React never passes `key` through props, so it still wins.
        key={lifecycle.key}
        {...props}
        // `action`, `onSubmit` and `onInput` must win over a consumer's
        // `...props`; a consumer's `onInput` is called from ours.
        className={cn(s.form, className)}
        action={formAction}
        onSubmit={onSubmit}
        onInput={(event) => {
          onInput?.(event)
          dispatch({ type: 'userEdited' })
        }}
      >
        {children}
      </form>
    </FormContext.Provider>
  )
}

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
      // `type` and the disabled-gate `onClick` must win over `...props`.
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

export type { FormState } from '@/lib/types/form'
export { useForm } from './hook'
export type {
  FormAction,
  FormContextActions,
  FormContextMeta,
  FormContextStandard,
  FormContextState,
} from './types'
