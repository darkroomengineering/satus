import cn from 'clsx'
import { Button } from 'components/button'
import useCart from 'global-swr/useCart'
import { Layout } from 'layouts/default'
import Shopify from 'lib/shopify'
import { useStore } from 'lib/store'
import Image from 'next/image'
import { useCallback, useState } from 'react'
import useSWR from 'swr'
import s from './pdp.module.scss'

export default function Pdp({ product, defaultVariant }) {
  const locomotive = useStore((state) => state.locomotive)
  const setToggleCart = useStore((state) => state.setToggleCart)
  const cart = useCart()
  const checkoutId = cart.checkoutId
  const [selectedVariant, setSelectedVariant] = useState({
    availableQuantity: 1000,
  })
  const [purchaseQuantity, setPurchaseQuantity] = useState(1)

  const { data, mutate } = useSWR(
    checkoutId ? 'cart' : null,
    () => cart.cartFetcher(`/api/checkout/${checkoutId}`),
    { fallbackData: { products: [] } }
  )

  const updateQuantity = useCallback(
    (quantity) => {
      setPurchaseQuantity(quantity)
    },
    [purchaseQuantity]
  )

  return (
    <Layout>
      <div className={cn('grid', s.product)}>
        <div className={s.image}>
          <Image src={product.images[0]} alt="" layout="fill" />
        </div>
        <div className={s.properties}>
          <h1 className={s.name}>{product.name}</h1>
          <div className={s.details}>
            <p className={s.price}>{`price: ${product.price}`}</p>
            <div className={s.variants}>
              <p className="text-uppercase">size: view guide</p>
              <div className={s.options}>
                {product.variants.map((variant, key) => (
                  <button
                    key={`variant-${key}`}
                    onClick={() => {
                      setSelectedVariant(variant)
                      updateQuantity(1)
                    }}
                    className={cn({
                      [s['selected-option']]:
                        selectedVariant &&
                        selectedVariant.size === variant.size,
                      [s['button-disabled']]: !variant.isAvailable,
                    })}
                  >
                    <p>{variant.size}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className={s.editable}>
            <div className={s.options}>
              <div className={s.quantity}>
                <button
                  onClick={() => {
                    updateQuantity(Math.max(purchaseQuantity - 1, 1))
                  }}
                >
                  -
                </button>
                <p>{purchaseQuantity}</p>
                <button
                  className={cn({
                    [s['button-disabled']]:
                      purchaseQuantity === selectedVariant.availableQuantity,
                  })}
                  onClick={() => {
                    updateQuantity(
                      Math.min(
                        purchaseQuantity + 1,
                        selectedVariant.availableQuantity
                      )
                    )
                  }}
                >
                  +
                </button>
              </div>
            </div>

            <Button
              className={cn(s['add-cart'], {
                [s['button-disabled']]: !selectedVariant.size,
              })}
              onClick={async () => {
                await cart.addItem(purchaseQuantity, selectedVariant.id)
                await mutate()
                setToggleCart(true)
                locomotive.stop()
              }}
            >
              Add To Cart
            </Button>
          </div>
          <p className={s.description}>{product.description}</p>
        </div>
      </div>
    </Layout>
  )
}

export const getStaticPaths = async () => {
  const store = new Shopify()
  const products = await store.getAllProducts()

  const paths = products.map((item) => ({
    params: { slug: item.slug },
  }))

  return {
    paths,
    fallback: false,
  }
}

export const getStaticProps = async ({ params }) => {
  const store = new Shopify()
  const products = await store.getAllProducts()
  const product = await store.getProductByHandle(params.slug)

  // console.log(product.variants.map((item) => item))

  const filteredSlider = products.filter(
    (product) => product.slug !== params.slug
  )

  const hasVariants = !!product.variants

  const selectDefaultVariant = () => {
    const notAllAvailable = product.variants.some(
      (variant) => !variant.isAvailable
    )
    const selectedVar = product.inStock
      ? notAllAvailable
        ? product.variants.find((variant) => variant.isAvailable)
        : product.variants.length >= 2
        ? product.variants[2]
        : product.variants[0]
      : product.variants[0]

    return {
      value: selectedVar.id,
      label: selectedVar.size,
    }
  }

  const fallbackNoVariants = {
    label: 'sold-out',
    value: 'sold-out',
  }

  return {
    props: {
      product: product,
      defaultVariant: hasVariants ? selectDefaultVariant() : fallbackNoVariants,
    },
    revalidate: 1,
  }
}
