'use client'

import cn from 'clsx'
import {
  createContext,
  type Dispatch,
  type HTMLAttributes,
  type SetStateAction,
  useContext,
  useEffect,
  useState,
} from 'react'
import { HubspotNewsletterAction } from '~/integrations/hubspot/action'
import {
  CreateCustomerAction,
  LoginCustomerAction,
  LogoutCustomerAction,
} from '~/integrations/shopify/customer/actions'
import { mutate } from '~/libs/tempus-queue'
import s from './form.module.css'
import { useForm } from './hook'

type FormProps = HTMLAttributes<HTMLFormElement> & {
  formId?: string
  action: keyof typeof formsActions
}

export function Form({ children, ...props }: FormProps) {
  const [key, setKey] = useState<string | null>(null)

  return (
    <FormProvider key={key} setKey={setKey} {...props}>
      {children}
    </FormProvider>
  )
}

type FormContextValue = Omit<
  ReturnType<typeof useForm>,
  'formAction' | 'onSubmit'
>

const FormContext = createContext<FormContextValue>(null!)

export function useFormContext() {
  return useContext(FormContext)
}

type FormProviderProps = FormProps & {
  setKey: Dispatch<SetStateAction<string | null>>
}

export function FormProvider({
  children,
  setKey,
  formId,
  action,
  className,
  ...props
}: FormProviderProps) {
  const { formAction, onSubmit, ...helpers } = useForm({
    // TODO: Fix useForm overloads
    // @ts-expect-error - no time to type, this usage works
    action: formsActions[action],
    formId,
    initialState: null,
    dependencies: [],
  })

  useEffect(() => {
    // TODO: Fix useForm overloads
    // @ts-expect-error - no time to type, this usage works
    if (helpers?.formState?.status) {
      mutate(() => {
        setTimeout(() => {
          setKey(crypto.randomUUID())
        }, 2000)
      })
    }
    // TODO: Fix useForm overloads
    // @ts-expect-error - no time to type, this usage works
  }, [helpers?.formState?.status, setKey])

  return (
    <FormContext.Provider value={helpers}>
      <form
        className={className}
        action={formAction}
        onSubmit={onSubmit}
        {...props}
      >
        {children}
      </form>
    </FormContext.Provider>
  )
}

type SubmitButtonProps = {
  className?: string
  defaultText?: string
}

export function SubmitButton({
  className,
  defaultText = 'submit',
}: SubmitButtonProps) {
  const [buttonText, setButtonText] = useState(defaultText)
  const { isReady, isPending, formState } = useFormContext()
  // TODO: Fix useForm overloads
  // @ts-expect-error - no time to type, this usage works
  const submitted = formState?.status === 200
  // TODO: Fix useForm overloads
  // @ts-expect-error - no time to type, this usage works
  const error = formState?.status === 500

  useEffect(() => {
    if (submitted) {
      setButtonText('success')
    }
    if (error) {
      setButtonText('error')
    }
    if (isPending) {
      setButtonText('pending')
    }
  }, [isPending, submitted, error])

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
        submitted && s.submitted,
        error && s.error
      )}
    >
      <span>{buttonText}</span>
    </button>
  )
}

export function Messages({ className }: { className?: string }) {
  const { errors } = useFormContext()

  return (
    <div className={cn(s.messages, className)}>
      {errors.map((error) => (
        <p className={cn('p-xs', s.error)} key={error.message}>
          {error.message}
        </p>
      ))}
    </div>
  )
}

const formsActions = {
  HubspotNewsletterAction: HubspotNewsletterAction,
  LoginCustomerAction: LoginCustomerAction,
  LogoutCustomerAction: LogoutCustomerAction,
  CreateCustomerAction: CreateCustomerAction,
}
