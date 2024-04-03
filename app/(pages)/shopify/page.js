import { Cart } from 'libs/shopify/cart'
import { Wrapper } from '../(components)/wrapper'
import { Product } from './(components)/product'
import { ShowCart } from './(components)/show-cart'
import s from './shopify.module.scss'

export default async function Shopify() {
  return (
    <Wrapper theme="red" className={s.page}>
      <Cart>
        <ShowCart className={s.cart} />
        <Product />
      </Cart>
    </Wrapper>
  )
}
