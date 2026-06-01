import { Suspense } from 'react'
import { Wrapper } from '@/components/layout/wrapper'
import { NotConfigured } from '@/components/ui/not-configured'
import { isConfigured } from '@/integrations/registry'
import { getCustomer } from '@/integrations/shopify/customer/actions'
import type { Customer } from '@/integrations/shopify/types'
import { LoginForm, LogoutButton, RegisterForm } from '../_components/customer'
import s from './account.module.css'

export default async function AccountPage() {
  if (!isConfigured('shopify')) {
    return (
      <Wrapper theme="dark">
        <NotConfigured integration="Shopify" />
      </Wrapper>
    )
  }

  const customer = await getCustomer()

  return (
    <Wrapper theme="dark" className="overflow-clip font-mono uppercase">
      <section className={s.section}>
        <div className={s.header}>
          <div className={s.label}>Shopify</div>
          <h1 className={s.title}>My Account</h1>
        </div>

        {customer ? (
          <Suspense fallback={<div className={s.loading}>Loading&hellip;</div>}>
            <CustomerInfo customer={customer} />
            <div className={s.logoutRow}>
              <LogoutButton />
            </div>
          </Suspense>
        ) : (
          <div className={s.forms}>
            <div className={s.formPanel}>
              <h2 className={s.panelTitle}>Login</h2>
              <LoginForm />
            </div>
            <div className={s.divider} aria-hidden="true" />
            <div className={s.formPanel}>
              <h2 className={s.panelTitle}>Register</h2>
              <RegisterForm />
            </div>
          </div>
        )}
      </section>
    </Wrapper>
  )
}

function CustomerInfo({ customer }: { customer: Customer }) {
  return (
    <div className={s.customerPanel}>
      <div className={s.customerRow}>
        <span className={s.customerKey}>Name</span>
        <span className={s.customerValue}>{customer.firstName}</span>
      </div>
      <div className={s.customerRow}>
        <span className={s.customerKey}>Email</span>
        <span className={s.customerValue}>{customer.email}</span>
      </div>
      {customer.orders.edges.length > 0 && (
        <div className={s.orders}>
          <h3 className={s.ordersTitle}>Recent Orders</h3>
          <ul className={s.orderList}>
            {customer.orders.edges.map(({ node }) => (
              <li key={node.id} className={s.orderItem}>
                <span className={s.orderNumber}>#{node.orderNumber}</span>
                <span className={s.orderTotal}>
                  {node.totalPrice.amount} {node.totalPrice.currencyCode}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
