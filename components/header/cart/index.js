import cn from 'clsx'
import { Button } from 'components/button'
import useCart from 'global-swr/useCart'
import useClickOutsideEvent from 'hooks/use-click-outside'
import { useStore } from 'lib/store'
import Image from 'next/image'
import { useEffect, useRef } from 'react'
import useSWR from 'swr'
import s from './cart.module.scss'

export const Cart = ({}) => {
  const locomotive = useStore((state) => state.locomotive)
  const [toggleCart, setToggleCart] = useStore((state) => [
    state.toggleCart,
    state.setToggleCart,
  ])
  const menuRef = useRef(null)

  useClickOutsideEvent(menuRef, () => {
    setToggleCart(false)
    locomotive.start()
  })

  const cart = useCart()
  const checkoutId = cart.checkoutId
  const { data, mutate } = useSWR(
    checkoutId ? 'cart' : null,
    () => cart.cartFetcher(`/api/checkout/${checkoutId}`),
    { fallbackData: { products: [] } }
  )

  useEffect(() => {
    console.log(data)
  }, [data])

  const removeItem = (id) => {
    cart.removeItem(id)
    const mutatedData = data.products.filter((product) => product.id !== id)
    data.products = mutatedData
    mutate(data, false)
  }

  const updateItemQuantiy = (quantity, id) => {
    cart.updateItem(quantity, id)
    data.products.map((product) => {
      if (product.id === id) {
        product.quantity = quantity
      }
    })
    mutate(data, false)
  }

  return (
    <div className={cn(s['cart-overlay'], { [s['set-overlay']]: toggleCart })}>
      <div
        className={cn(s.cart, {
          [s['show-cart']]: toggleCart,
          [s['hide-cart']]: !toggleCart,
        })}
        ref={menuRef}
      >
        <div className={s.inner}>
          <div className={s['cart-header']}>
            <p>Your Bag</p>
            <button
              onClick={() => {
                setToggleCart(false)
              }}
            >
              close
            </button>
          </div>
          <div className={s['cart-products-wrapper']}>
            {data.products.map((product, key) => (
              <div key={`cart-item-${key}`} className={s['cart-products']}>
                <div className={s['product-image']}>
                  <Image src={product.image} alt="" layout="fill" />
                </div>
                <div className={s['product-details']}>
                  <div className={s['product-name-price']}>
                    <p>{product.name}</p>
                    <p>{product.options.price}</p>
                  </div>
                  <div className={s['product-editables']}>
                    <div className={s.options}>
                      <div className={s.quantity}>
                        <p className="text-uppercase">QTY</p>
                        <aside>
                          <button
                            onClick={() => {
                              updateItemQuantiy(
                                Math.max(product.quantity - 1, 1),
                                product.id
                              )
                            }}
                          >
                            -
                          </button>
                          <p>{product.quantity}</p>
                          <button
                            className={cn({
                              [s['button-disabled']]:
                                product.quantity ===
                                product.options.availableQuantity,
                            })}
                            onClick={() => {
                              updateItemQuantiy(
                                product.quantity + 1,
                                product.id
                              )
                            }}
                          >
                            +
                          </button>
                        </aside>
                      </div>
                      <div className={s.size}>
                        <p className="text-uppercase">SIZE</p>
                        <aside>{`${product.options.option}`}</aside>
                      </div>
                    </div>
                    <button
                      className={s.remove}
                      onClick={() => {
                        removeItem(product.id)
                      }}
                    >
                      REMOVE
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className={s['cart-details']}>
            <Button className={s.button}>Checkout</Button>
            <div className={s['total-price']}>
              <p>total</p>
              <p>{data.totalPrice}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
