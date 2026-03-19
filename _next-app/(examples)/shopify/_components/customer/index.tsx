'use client'

import { Form, SubmitButton } from '@/components/ui/form'
import { InputField } from '@/components/ui/form/fields'
import {
  CreateCustomerAction,
  LoginCustomerAction,
  LogoutCustomerAction,
} from '@/integrations/shopify/customer/actions'

export function LoginForm() {
  return (
    <Form action={LoginCustomerAction}>
      <InputField
        type="email"
        id="email"
        placeholder="Email"
        required={true}
        idx={0}
      />
      <InputField
        type="password"
        id="password"
        placeholder="Password"
        required={true}
        idx={1}
      />
      <SubmitButton defaultText="Login" />
    </Form>
  )
}

export function RegisterForm() {
  return (
    <Form action={CreateCustomerAction}>
      <InputField
        type="text"
        id="firstName"
        placeholder="First Name"
        required={true}
        idx={0}
      />
      <InputField
        type="text"
        id="lastName"
        placeholder="Last Name"
        required={true}
        idx={1}
      />
      <InputField
        type="email"
        id="email"
        placeholder="Email"
        required={true}
        idx={2}
      />
      <InputField
        type="password"
        id="password"
        placeholder="Password"
        required={true}
        idx={3}
      />
      <SubmitButton defaultText="Register" />
    </Form>
  )
}

export function LogoutButton() {
  return (
    <Form action={LogoutCustomerAction}>
      <SubmitButton defaultText="Logout" />
    </Form>
  )
}
