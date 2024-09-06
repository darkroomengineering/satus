'use client'

import { Form, SubmitButton } from 'libs/form'
import { InputField } from 'libs/form/fields'

// import {
//   LoginCustomerAction,
//   LogoutCustomerAction,
//   CreateCustomerAction,
// } from 'libs/shopify/customer/actions'

// function InputField({ type, id, placeholder, required, value, onChange }) {
//   return (
//     <div className="field">
//       <input
//         type={type}
//         id={id}
//         name={id}
//         required={required}
//         placeholder={placeholder}
//         className="input"
//         value={value}
//         onChange={onChange}
//       />
//     </div>
//   )
// }

export function LoginForm() {
  return (
    <Form action={'LoginCustomerAction'}>
      <InputField type="email" id="email" placeholder="Email" required={true} />
      <InputField
        type="password"
        id="password"
        placeholder="Password"
        required={true}
      />
      <SubmitButton defaultText="Login" />
    </Form>
  )
}

export function RegisterForm() {
  return (
    <Form action={'CreateCustomerAction'}>
      <InputField
        type="text"
        id="firstName"
        placeholder="First Name"
        required={true}
      />
      <InputField
        type="text"
        id="lastName"
        placeholder="Last Name"
        required={true}
      />
      <InputField type="email" id="email" placeholder="Email" required={true} />
      <InputField
        type="password"
        id="password"
        placeholder="Password"
        required={true}
      />
      <SubmitButton defaultText="Register" />
    </Form>
  )
}

export function LogoutButton() {
  return (
    <Form action={'LogoutCustomerAction'}>
      <SubmitButton defaultText="Logout" />
    </Form>
  )
}
