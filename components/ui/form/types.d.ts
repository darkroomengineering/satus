import type { ComponentPropsWithoutRef, ReactNode, RefObject } from 'react'

export type InputRefData = {
  node: HTMLElement
  required: boolean
  message: string
}

export type FieldState = {
  state: boolean
  message: string
}

export type InputRef = Map<string, InputRefData>
export type ActiveField = Map<string, Pick<FieldState, 'state'>>
export type ErrorField = Map<string, FieldState>

// Core Form State & Props
export type FormState = {
  status: number
  message: string
  inputs?: Record<string, string> // For server-side validation
  errors?: ErrorField // For server-side validation
}

export interface UseFormProps {
  action: (
    prevState: FormState<TFieldValues>,
    formData: FormData
  ) => Promise<FormState<TFieldValues>>
  initialState: FormState<TFieldValues>
  onBlur?: boolean
  resetTime?: number
}

export interface FormProps
  extends Omit<
    ComponentPropsWithoutRef<'form'>,
    'action' | 'children' | 'className' | 'onSubmit'
  > {
  children: ReactNode
  className?: string
  refreshTime?: number
  action: (
    prevState: FormState<TFieldValues>,
    formData: FormData
  ) => Promise<FormState<TFieldValues>>
  onSuccess?: (formState: FormState<TFieldValues>) => void
}

export type RegisterParams = {
  id: string
  required: boolean
  message?: string
  validation?: (value: string) => boolean
}

export type ValidationParams = {
  id: string
  value: string
  validation: (value: string) => boolean
}

export type OnActivityParams = {
  id: string
  value: string
}

export type SetRefParams = {
  id: string
  data: InputRefData
}

export interface FormContextValue {
  ref: RefObject<HTMLFormElement | null>
  activeFields: ActiveField
  errors: ErrorField
  isFormReady: boolean
  isFormPending: boolean
  isFormSuccess: boolean
  isFormError: boolean
  formState: FormState
  register: (params: RegisterParams) => Record<string, unknown>
  setRef: (params: SetRefParams) => void
  onValidation: (params: ValidationParams) => void
}

export interface FormProviderProps extends FormProps {
  children: ReactNode
}

// Component-Specific Props
export interface SubmitButtonProps
  extends Omit<ComponentPropsWithoutRef<'button'>, 'children'> {
  children: ReactNode
  className?: string
  textStates?: {
    error: string
    pending: string
    success: string
    already_subscribed?: string
    message_received?: string
  }
}

export interface MessagesProps extends ComponentPropsWithoutRef<'div'> {}

interface BaseFieldProps {
  className?: string
  id: string
  name?: string
  label: ReactNode
  defaultValue?: string
  placeholder?: string
  required?: boolean
  validation?: (value: string) => boolean
  triggerFocus?: boolean
}

export interface InputProps extends BaseFieldProps {
  type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'
}

export interface TextareaProps extends BaseFieldProps {
  rows?: number
}
