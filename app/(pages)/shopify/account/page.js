import { getCustomer } from 'libs/shopify/customer/actions'
import { Suspense } from 'react'
import { LoginForm, LogoutButton, RegisterForm } from '../(components)/customer'
import { Wrapper } from '../../(components)/wrapper'
import s from './account.module.scss'

export default async function AccountPage() {
  const customer = await getCustomer()

  return (
    <Wrapper theme="red" className={s.page}>
      <section className={s.inner}>
        <h1 className="p">My Account</h1>
        {customer ? (
          <Suspense fallback={<div>Loading...</div>}>
            <CustomerInfo customer={customer} />
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

function CustomerInfo({ customer }) {
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
