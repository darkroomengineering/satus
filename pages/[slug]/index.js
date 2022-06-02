import cn from 'clsx'
import { Button } from 'components/button'
import { Slider } from 'components/slider'
import { Layout } from 'layouts/default'
import Shopify from 'lib/shopify'
import { useStore } from 'lib/store'
import useCart from 'lib/use-cart'
import Image from 'next/image'
import { useCallback, useState } from 'react'
import useSWR from 'swr'
import s from './pdp.module.scss'

export default function Pdp({ product, relatedProducts }) {
  const setToggleCart = useStore((state) => state.setToggleCart)
  const cart = useCart()
  const checkoutId = cart.checkoutId
  const [selectedVariant, setSelectedVariant] = useState({
    availableQuantity: 1000,
  })
  const [purchaseQuantity, setPurchaseQuantity] = useState(1)

  const { data, isValidating, mutate } = useSWR(
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
      <section data-scroll-section className={cn('layout-grid', s.product)}>
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
              <div
                className={cn(s.quantity, {
                  [s['button-disabled']]: !selectedVariant.size,
                })}
              >
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
              }}
            >
              Add To Cart
            </Button>
          </div>
          <p className={s.description}>{product.description}</p>
        </div>
      </section>
      <section data-scroll-section className={s['related-products']}>
        <Slider
          emblaApi={{
            containScroll: 'keepSnaps',
            startIndex: 0,
          }}
        >
          {({ currentIndex, emblaRef, SliderNavigation }) => {
            return (
              <>
                <div className={s['slider-header']}>
                  <p className="h5">More Products</p>
                  <SliderNavigation counterColor={'var(--theme-contrast'}>
                    {currentIndex + 1}/{relatedProducts.length}
                  </SliderNavigation>
                </div>
                <Slider.Slides ref={emblaRef} className={s.slider}>
                  {relatedProducts.map((product, idx) => (
                    <a
                      className={s['slide']}
                      key={`slide-item-${idx}`}
                      href={product.slug}
                    >
                      <div className={s['slide-inner']}>
                        <div className={s['image-height']}>
                          <Image
                            src={product.images[0].src}
                            alt=""
                            layout="fill"
                            priority
                          />
                        </div>
                        <p className={s['product-name']}>{product.name}</p>
                      </div>
                    </a>
                  ))}
                </Slider.Slides>
              </>
            )
          }}
        </Slider>
      </section>
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
  // If you need just the selected product:
  // const product = await store.getProductByHandle(params.slug)

  //If you need product & others products:
  const products = await store.getAllProducts()
  const getIndex = products.findIndex((product) => product.slug === params.slug)
  const product = products[getIndex]
  products.splice(getIndex, 1)

  return {
    props: {
      product: product,
      relatedProducts: products,
    },
    revalidate: 1,
  }
}
