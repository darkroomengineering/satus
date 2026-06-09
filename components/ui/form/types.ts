import type { ComponentPropsWithoutRef, ReactNode } from 'react'

// Form state returned by server actions
export type FormState<T = unknown> = {
  status: number
  message: string
  data?: T
  fieldErrors?: Record<string, string>
}

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

// Context state
export interface FormContextState<T = unknown> {
  formState: FormState<T> | null
  isPending: boolean
  isReady: boolean
  isActive: Record<string, boolean>
  isValid: Record<string, boolean>
  errors: Record<string, FieldError>
}

// Context actions
export interface FormContextActions<T = unknown> {
  register: UseFormReturn<T>['register']
  resetForm: () => void
}

// Context meta
export interface FormContextMeta {
  formId: string
}

// Context value shape
export type FormContextStandard<T = unknown> = {
  state: FormContextState<T>
  actions: FormContextActions<T>
  meta?: FormContextMeta
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
