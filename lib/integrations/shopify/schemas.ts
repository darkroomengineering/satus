import { z } from 'zod'

/**
 * Zod schemas for the Storefront API `data` payloads `shopifyFetch` validates
 * (via `dataSchema`), covering only the fields the app reads.
 *
 * Objects strip unknown keys instead of `.passthrough()`, so inferred types
 * match the plain interfaces in `types.ts`. A field a fragment selects that
 * survives a `...rest` spread in `adapters.ts` (e.g. `Product.options`) is
 * declared explicitly.
 *
 * Optionality follows the real Storefront API schema
 * (https://shopify.dev/docs/api/storefront): fields a fragment always selects
 * are required even where `types.ts` marks them optional, and nullable fields
 * use `.nullable()`, not `.optional()`/`.nullish()`, so the inferred type has
 * no explicit `undefined` that `exactOptionalPropertyTypes` rejects.
 */

const moneySchema = z.object({
  amount: z.string(),
  currencyCode: z.string(),
})

// `SEO.title`/`description` are `null` until a merchant sets them (common).
// The wrapping `seo` field's nullability differs per parent type.
const seoSchema = z.object({
  title: z.string().nullable(),
  description: z.string().nullable(),
})

const selectedOptionSchema = z.object({
  name: z.string(),
  value: z.string(),
})

// Only `url` is non-nullable on Storefront API's `Image`; width/height are
// `null` when the image isn't hosted by Shopify.
const shopifyImageSchema = z.object({
  url: z.string(),
  altText: z.string().nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
})

const edgeNode = <NodeSchema extends z.ZodTypeAny>(nodeSchema: NodeSchema) =>
  z.object({
    edges: z.array(z.object({ node: nodeSchema })),
  })

const shopifyProductVariantSchema = z.object({
  id: z.string(),
  title: z.string(),
  availableForSale: z.boolean(),
  selectedOptions: z.array(selectedOptionSchema),
  price: moneySchema,
})

const productOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  values: z.array(z.string()),
})

// `options` and `updatedAt` aren't on the `ShopifyProduct` type, but
// `toProduct()` spreads `...rest` into `Product` (which declares `options`),
// so they must be declared here to survive stripping.
const shopifyProductSchema = z.object({
  id: z.string(),
  handle: z.string(),
  title: z.string(),
  tags: z.array(z.string()),
  availableForSale: z.boolean(),
  images: edgeNode(shopifyImageSchema),
  // `null` when the product has no images. Without this key, strip mode
  // deletes it from every parsed product and `featuredImage` is always
  // `undefined` downstream.
  featuredImage: shopifyImageSchema.nullable(),
  variants: edgeNode(shopifyProductVariantSchema),
  description: z.string(),
  descriptionHtml: z.string(),
  options: z.array(productOptionSchema),
  priceRange: z.object({
    minVariantPrice: moneySchema,
    maxVariantPrice: moneySchema,
  }),
  seo: seoSchema,
  updatedAt: z.string(),
})

export const getProductResponseSchema = z.object({
  product: shopifyProductSchema.nullable(),
})
export type GetProductResponseData = z.infer<typeof getProductResponseSchema>

export const getProductRecommendationsResponseSchema = z.object({
  productRecommendations: z.array(shopifyProductSchema),
})
export type GetProductRecommendationsResponseData = z.infer<
  typeof getProductRecommendationsResponseSchema
>

export const getProductsResponseSchema = z.object({
  products: edgeNode(shopifyProductSchema),
})
export type GetProductsResponseData = z.infer<typeof getProductsResponseSchema>

// `path` is deliberately not declared: it isn't a Shopify field;
// `toCollection()` computes it.
const collectionSchema = z.object({
  handle: z.string(),
  title: z.string(),
  description: z.string(),
  seo: seoSchema,
  updatedAt: z.string(),
})

export const getCollectionResponseSchema = z.object({
  collection: collectionSchema.nullable(),
})
export type GetCollectionResponseData = z.infer<
  typeof getCollectionResponseSchema
>

export const getCollectionProductsResponseSchema = z.object({
  collection: z.object({ products: edgeNode(shopifyProductSchema) }).nullable(),
})
export type GetCollectionProductsResponseData = z.infer<
  typeof getCollectionProductsResponseSchema
>

export const getCollectionsResponseSchema = z.object({
  collections: edgeNode(collectionSchema),
})
export type GetCollectionsResponseData = z.infer<
  typeof getCollectionsResponseSchema
>

export const getMenuResponseSchema = z.object({
  menu: z
    .object({
      items: z.array(
        z.object({
          title: z.string(),
          url: z.string(),
        })
      ),
    })
    .nullable(),
})
export type GetMenuResponseData = z.infer<typeof getMenuResponseSchema>

// Unlike Product/Collection, `Page.seo` itself is nullable.
const pageSchema = z.object({
  id: z.string(),
  title: z.string(),
  handle: z.string(),
  body: z.string(),
  bodySummary: z.string(),
  seo: seoSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const getPageResponseSchema = z.object({
  pageByHandle: pageSchema.nullable(),
})
export type GetPageResponseData = z.infer<typeof getPageResponseSchema>

export const getPagesResponseSchema = z.object({
  pages: edgeNode(pageSchema),
})
export type GetPagesResponseData = z.infer<typeof getPagesResponseSchema>

// Only the fields the app reads; the rest of the cart fragment's
// `...product` is intentionally stripped.
const cartLineProductSchema = z.object({
  id: z.string(),
  handle: z.string(),
  title: z.string(),
  featuredImage: shopifyImageSchema.nullable(),
})

const shopifyCartLineItemSchema = z.object({
  id: z.string(),
  quantity: z.number(),
  cost: z.object({
    totalAmount: moneySchema,
  }),
  merchandise: z.object({
    id: z.string(),
    title: z.string(),
    selectedOptions: z.array(selectedOptionSchema),
    product: cartLineProductSchema,
  }),
})

const shopifyCartSchema = z.object({
  id: z.string(),
  checkoutUrl: z.string(),
  totalQuantity: z.number(),
  cost: z.object({
    // Deprecated and nullable; see `DefaultCart.cost.totalTaxAmount` in
    // `types.ts`.
    totalTaxAmount: moneySchema.nullable(),
    subtotalAmount: moneySchema,
    totalAmount: moneySchema,
  }),
  lines: edgeNode(shopifyCartLineItemSchema),
})

export const cartCreateResponseSchema = z.object({
  cartCreate: z.object({ cart: shopifyCartSchema }),
})
export type CartCreateResponseData = z.infer<typeof cartCreateResponseSchema>

export const cartLinesAddResponseSchema = z.object({
  cartLinesAdd: z.object({ cart: shopifyCartSchema }),
})
export type CartLinesAddResponseData = z.infer<
  typeof cartLinesAddResponseSchema
>

export const cartLinesRemoveResponseSchema = z.object({
  cartLinesRemove: z.object({ cart: shopifyCartSchema }),
})
export type CartLinesRemoveResponseData = z.infer<
  typeof cartLinesRemoveResponseSchema
>

export const cartLinesUpdateResponseSchema = z.object({
  cartLinesUpdate: z.object({ cart: shopifyCartSchema }),
})
export type CartLinesUpdateResponseData = z.infer<
  typeof cartLinesUpdateResponseSchema
>

export const getCartResponseSchema = z.object({
  cart: shopifyCartSchema.nullable(),
})
export type GetCartResponseData = z.infer<typeof getCartResponseSchema>

const customerUserErrorSchema = z.object({
  message: z.string(),
})

export const customerAccessTokenCreateResponseSchema = z.object({
  customerAccessTokenCreate: z.object({
    customerAccessToken: z
      .object({
        accessToken: z.string(),
        expiresAt: z.string(),
      })
      .nullable(),
    customerUserErrors: z.array(customerUserErrorSchema),
  }),
})
export type CustomerAccessTokenCreateResponseData = z.infer<
  typeof customerAccessTokenCreateResponseSchema
>

export const customerAccessTokenDeleteResponseSchema = z.object({
  customerAccessTokenDelete: z.object({
    deletedAccessToken: z.string().nullable().optional(),
    deletedCustomerAccessTokenId: z.string().nullable().optional(),
    userErrors: z.array(customerUserErrorSchema),
  }),
})
export type CustomerAccessTokenDeleteResponseData = z.infer<
  typeof customerAccessTokenDeleteResponseSchema
>

// `customerCreateMutation` does not fetch `orders` (unlike `getCustomerQuery`);
// validating the full `Customer` shape would reject a well-formed response.
const createdCustomerSchema = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
})

export const customerCreateResponseSchema = z.object({
  customerCreate: z.object({
    customer: createdCustomerSchema.nullable(),
    customerUserErrors: z.array(customerUserErrorSchema),
  }),
})
export type CustomerCreateResponseData = z.infer<
  typeof customerCreateResponseSchema
>

const customerSchema = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  orders: z.object({
    edges: z.array(
      z.object({
        node: z.object({
          id: z.string(),
          orderNumber: z.number(),
          totalPrice: moneySchema,
        }),
      })
    ),
  }),
})

export const getCustomerResponseSchema = z.object({
  customer: customerSchema.nullable(),
})
export type GetCustomerResponseData = z.infer<typeof getCustomerResponseSchema>
