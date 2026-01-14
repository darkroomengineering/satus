import type { ComponentPropsWithoutRef, ReactNode } from 'react'

// Form state returned by server actions
export type FormState<T = unknown> = {
  status: number
  message: string
  data?: T
  fieldErrors?: Record<string, string>
  /** Legacy: For backward compatibility with existing integrations (mailchimp, mandrill) */
  errors?: ErrorField
  /** Legacy: For backward compatibility with existing integrations */
  inputs?: Record<string, string>
}

// Legacy error field type (Map-based) for backward compatibility with mailchimp/mandrill
export type ErrorField = Map<string, FieldError>

// Server action type
export type FormAction<T = unknown> = (
  prevState: FormState<T> | null,
  formData: FormData
) => Promise<FormState<T>>

// Internal state tracking
export type FieldError = {
  state: boolean
  message: string
}

export type RegisterParams = {
  id: string
  required?: boolean
  message?: string
  validation?: (value: string) => boolean
}

// Form hook options
export interface UseFormOptions<T = unknown> {
  action: FormAction<T>
  initialState?: FormState<T> | null
  onBlur?: boolean
  formId?: string
}

// Form hook return value
export interface UseFormReturn<T = unknown> {
  formState: FormState<T> | null
  formAction: (formData: FormData) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  register: (index: number) => {
    ref: (node: HTMLInputElement | HTMLTextAreaElement | null) => void
    onChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => void
    onBlur: (
      e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => void
  }
  isActive: boolean[]
  isValid: boolean[]
  isPending: boolean
  isReady: boolean
  errors: FieldError[]
}

// Form component props
export interface FormProps<T = unknown>
  extends Omit<ComponentPropsWithoutRef<'form'>, 'action' | 'onError'> {
  children: ReactNode
  className?: string
  action: FormAction<T>
  formId?: string
  onSuccess?: (state: FormState<T>) => void
  onError?: (state: FormState<T>) => void
}

// Form context value
export interface FormContextValue<T = unknown> {
  formState: FormState<T> | null
  isPending: boolean
  isReady: boolean
  isActive: boolean[]
  isValid: boolean[]
  errors: FieldError[]
  register: UseFormReturn<T>['register']
}

// Submit button props
export interface SubmitButtonProps
  extends Omit<ComponentPropsWithoutRef<'button'>, 'children'> {
  children?: ReactNode
  className?: string
  defaultText?: string
  pendingText?: string
  successText?: string
  errorText?: string
}

// Messages component props
export interface MessagesProps extends ComponentPropsWithoutRef<'div'> {
  className?: string
}

// Field base props
export interface BaseFieldProps {
  className?: string
  id: string
  name?: string
  label?: ReactNode
  defaultValue?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  validation?: (value: string) => boolean
}

export interface InputProps extends BaseFieldProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'
}

export interface TextareaProps extends BaseFieldProps {
  rows?: number
}

export interface CheckboxFieldProps
  extends Omit<BaseFieldProps, 'placeholder'> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}
