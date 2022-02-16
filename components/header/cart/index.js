import cn from 'clsx'
import useClickOutsideEvent from 'hooks/use-click-outside'
import { useStore } from 'lib/store'
import useCart from 'lib/use-cart'
import Image from 'next/image'
import { useEffect, useRef } from 'react'
import useSWR from 'swr'
import s from './cart.module.scss'
import { SizesDropdown } from './variant-size-dropdown'

export const Cart = ({}) => {
  const locomotive = useStore((state) => state.locomotive)
  const isDebouncing = useStore((state) => state.isDebouncing)
  const [toggleCart, setToggleCart] = useStore((state) => [
    state.toggleCart,
    state.setToggleCart,
  ])
  const menuRef = useRef(null)
  const debouncingInterval = 400

  useClickOutsideEvent(menuRef, () => {
    if (!isDebouncing) {
      setToggleCart(false)
      locomotive.start()
    }
  })

  const cart = useCart()
  const checkoutId = cart.checkoutId
  const { data, isValidating, mutate } = useSWR(
    checkoutId ? 'cart' : null,
    () => cart.cartFetcher(`/api/checkout/${checkoutId}`),
    { fallbackData: { products: [] } }
  )

  useEffect(() => {
    console.log({ data })
  }, [data])

  const updateCartPrice = () => {
    return data.products.reduce(
      (previousItem, currentItem) =>
        previousItem + currentItem.options.price * currentItem.quantity,
      0
    )
  }

  const removeItem = async (id) => {
    cart.removeItem(id)
    const mutatedProducts = data.products.filter((product) => product.id !== id)
    data.products = mutatedProducts
    data.totalPrice = updateCartPrice()
    mutate(data, false)
  }

  const updateItemQuantity = async (quantity, lineItemId, variantId) => {
    cart.updateItem(quantity, variantId, lineItemId)
    const getItem = data.products.findIndex((item) => item.id === lineItemId)
    data.products[getItem].quantity = quantity
    data.totalPrice = updateCartPrice()
    mutate(data, false)
  }

  const changeSelectedVariant = async (product, newOption) => {
    const checkExistingVariant = data.products.find(
      (item) => item.options.option === newOption.option
    )
    if (checkExistingVariant !== undefined) {
      updateItemQuantity(
        Math.min(
          product.quantity + checkExistingVariant.quantity,
          newOption.availableQuantity
        ),
        checkExistingVariant.id,
        checkExistingVariant.options.id
      )
      removeItem(product.id)
      return
    }

    const newQuantity = Math.min(product.quantity, newOption.availableQuantity)
    cart.updateItem(newQuantity, newOption.id, product.id)
    const getItem = data.products.findIndex((item) => item.id === product.id)
    data.products[getItem].options = newOption
    data.products[getItem].quantity = newQuantity
    data.totalPrice = updateCartPrice()
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
                    <p>{Math.max(product.options.price, 1)}</p>
                  </div>
                  <div className={s['product-editables']}>
                    <div className={s.options}>
                      <div className={s.quantity}>
                        <p className="text-uppercase">QTY</p>
                        <aside>
                          <button
                            onClick={cart.debounce(() => {
                              updateItemQuantity(
                                Math.max(product.quantity - 1, 1),
                                product.id,
                                product.options.id
                              )
                            }, debouncingInterval)}
                          >
                            –
                          </button>
                          <p>
                            {product.quantity < 10
                              ? `0${product.quantity}`
                              : product.quantity}
                          </p>
                          <button
                            className={cn({
                              [s['button-disabled']]:
                                product.quantity ===
                                product.options.availableQuantity,
                            })}
                            onClick={cart.debounce(() => {
                              updateItemQuantity(
                                Math.min(
                                  product.quantity + 1,
                                  product.options.availableQuantity
                                ),
                                product.id,
                                product.options.id
                              )
                            }, debouncingInterval)}
                          >
                            +
                          </button>
                        </aside>
                      </div>
                      <div className={s.size}>
                        <p className="text-uppercase">SIZE</p>
                        <aside>
                          <SizesDropdown
                            product={product}
                            variants={product.variants.filter(
                              (variant) =>
                                variant.id !== product.options.id &&
                                variant.options.availableQuantity > 0
                            )}
                            onChange={cart.debounce(
                              (currentProduct, newVariant) => {
                                changeSelectedVariant(
                                  currentProduct,
                                  newVariant
                                )
                              },
                              debouncingInterval
                            )}
                          />
                        </aside>
                      </div>
                    </div>
                    <button
                      className={cn(s.remove, {
                        [s['button-disabled']]: isDebouncing,
                      })}
                      onClick={cart.debounce(() => {
                        removeItem(product.id)
                      }, debouncingInterval)}
                    >
                      REMOVE
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className={s['cart-details']}>
            <a
              className={cn(s['check-out'], {
                [s['button-disabled']]: isDebouncing || !data.products[0],
              })}
              onClick={async () => {
                await mutate()
              }}
              href={data.products[0] ? data?.checkoutUrl : null}
              target="_blank"
              rel="noopener noreferrer"
            >
              <p>Checkout</p>
            </a>
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
