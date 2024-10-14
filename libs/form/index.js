'use client'

import cn from 'clsx'
import { HubspotNewsletterAction } from 'libs/hubspot-forms/action'
import {
  CreateCustomerAction,
  LoginCustomerAction,
  LogoutCustomerAction,
} from 'libs/shopify/customer/actions'
import { createContext, useContext, useEffect, useState } from 'react'
import s from './form.module.scss'
import { useForm } from './hook'

export const Form = ({ children, ...props }) => {
  const [key, setKey] = useState(null)

  return (
    <FormProvider key={key} setKey={setKey} {...props}>
      {children}
    </FormProvider>
  )
}

const formContext = createContext()
export const useFormContext = () => {
  return useContext(formContext)
}

export const FormProvider = ({
  children,
  setKey,
  formId,
  action,
  className,
  ...props
}) => {
  const { formAction, onSubmit, ...helpers } = useForm({
    action: formsActions[action],
    formId,
    initialState: null,
    dependencies: [],
  })

  useEffect(() => {
    if (helpers?.formState?.status) {
      setTimeout(() => {
        setKey(crypto.randomUUID())
      }, 2000)
    }
  }, [helpers, setKey])

  return (
    <formContext.Provider value={helpers}>
      <form
        className={className}
        action={formAction}
        onSubmit={onSubmit}
        {...props}
      >
        {children}
      </form>
    </formContext.Provider>
  )
}

export function SubmitButton({ className, defaultText = 'submit' }) {
  const [buttonText, setButtonText] = useState(defaultText)
  const { isReady, isPending, formState } = useFormContext()
  const submitted = formState?.status === 200
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
        error && s.error,
      )}
    >
      <span>{buttonText}</span>
    </button>
  )
}

export const Messages = ({ className }) => {
  const { errors } = useFormContext()

  return (
    <div className={cn(s.messages, className)}>
      {errors.map((error, idx) => (
        <p className={cn('p-xs', s.error)} key={idx}>
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
