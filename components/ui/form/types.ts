import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import type { FormState } from '@/lib/types/form'

export type FormAction<T = unknown> = (
  prevState: FormState<T> | null,
  formData: FormData
) => Promise<FormState<T>>

export type FieldError = {
  state: boolean
  message: string
}

export interface UseFormOptions<T = unknown> {
  action: FormAction<T>
  initialState?: FormState<T> | null
  onBlur?: boolean
  formId?: string
}

export interface UseFormReturn<T = unknown> {
  formState: FormState<T> | null
  formAction: (formData: FormData) => void
  onSubmit: (event: React.SubmitEvent<HTMLFormElement>) => void
  register: (name: string) => {
    ref: (node: HTMLInputElement | HTMLTextAreaElement | null) => void
    onChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => void
    onBlur: (
      e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => void
  }
  isActive: Record<string, boolean>
  isValid: Record<string, boolean>
  isPending: boolean
  isReady: boolean
  errors: Record<string, FieldError>
}

export interface FormProps<T = unknown> extends Omit<
  ComponentPropsWithoutRef<'form'>,
  'action' | 'onError'
> {
  children: ReactNode
  className?: string
  action: FormAction<T>
  formId?: string
  onSuccess?: (state: FormState<T>) => void
  onError?: (state: FormState<T>) => void
}

export interface FormContextState<T = unknown> {
  formState: FormState<T> | null
  isPending: boolean
  isReady: boolean
  isActive: Record<string, boolean>
  isValid: Record<string, boolean>
  errors: Record<string, FieldError>
}

export interface FormContextActions<T = unknown> {
  register: UseFormReturn<T>['register']
  resetForm: () => void
}

export interface FormContextMeta {
  formId: string
}

export type FormContextStandard<T = unknown> = {
  state: FormContextState<T>
  actions: FormContextActions<T>
  meta?: FormContextMeta
}

export interface SubmitButtonProps extends Omit<
  ComponentPropsWithoutRef<'button'>,
  'children'
> {
  children?: ReactNode
  className?: string
  defaultText?: string
  pendingText?: string
  successText?: string
  errorText?: string
}

export interface MessagesProps extends ComponentPropsWithoutRef<'div'> {
  className?: string
}
