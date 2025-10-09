import { Suspense } from 'react'
import { Wrapper } from '~/app/(pages)/(components)/wrapper'
import { getCustomer } from '~/integrations/shopify/customer/actions'
import type { Customer } from '~/integrations/shopify/types'
import { LoginForm, LogoutButton, RegisterForm } from '../(components)/customer'

export default async function AccountPage() {
  const customer = await getCustomer()

  return (
    <Wrapper theme="red" className="font-mono uppercase overflow-clip">
      <section className="flex flex-col items-center justify-center grow max-dt:px-safe">
        <h1 className="p">My Account</h1>
        {customer ? (
          <Suspense fallback={<div>Loading...</div>}>
            <CustomerInfo customer={customer as Customer} />
            <LogoutButton />
          </Suspense>
        ) : (
          <div>
            <h2>Login</h2>
            <LoginForm />
            <h2>Register</h2>
            <RegisterForm />
          </div>
        )}
      </section>
    </Wrapper>
  )
}

function CustomerInfo({ customer }: { customer: Customer }) {
  return (
    <>
      <h2>Welcome, {customer.firstName}!</h2>
      <p>Email: {customer.email}</p>
      <h3>Recent Orders</h3>
      <ul>
        {customer.orders.edges.map(({ node }) => (
          <li key={node.id}>
            Order #{node.orderNumber} - {node.totalPrice.amount}{' '}
            {node.totalPrice.currencyCode}
          </li>
        ))}
      </ul>
    </>
  )
}
