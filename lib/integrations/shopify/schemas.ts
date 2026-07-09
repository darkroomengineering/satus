import { z } from 'zod'

/**
 * Zod schemas for the Shopify Storefront API payloads that
 * `lib/integrations/shopify/**` callers actually read.
 *
 * These validate the `data` field of `shopifyFetch` responses at the
 * boundary (passed via `dataSchema`). They intentionally do NOT attempt
 * exhaustive Shopify API modeling — only the fields the app destructures.
 * Objects use Zod's default "strip unknown keys" mode rather than
 * `.passthrough()`, so their inferred types line up exactly with the plain
 * interfaces in `types.ts` (no leftover index signature). Where a GraphQL
 * fragment selects a field that isn't part of a call site's TS interface
 * but survives a `...rest` spread in `reshape.ts` (e.g. `Product.options`),
 * that field is declared explicitly below instead of relying on passthrough.
 *
 * Optionality/nullability is aligned field-by-field with the real
 * Storefront API schema (verified against https://shopify.dev/docs/api/storefront),
 * not just with what happened to type-check before: fields a fragment always
 * selects are required here even when the corresponding `types.ts` field is
 * marked optional (a required source is always assignable to an optional
 * target), and fields the Storefront API documents as nullable use
 * `.nullable()` rather than `.optional()` or `.nullish()` so the inferred
 * type never includes an explicit `undefined` that
 * `exactOptionalPropertyTypes` would reject.
 *
 * Each schema is paired with an exported `z.infer` type alias so call sites
 * can do `shopifyFetch<GetProductResponseData>({ dataSchema: getProductResponseSchema, ... })`
 * without duplicating the shape.
 */

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

const moneySchema = z.object({
  amount: z.string(),
  currencyCode: z.string(),
})

// Storefront API `SEO.title` / `SEO.description` are nullable String fields
// — they're `null` until a merchant explicitly sets meta title/description
// in the admin, which is common. The wrapping `seo` field's own
// nullability differs per parent type (see usage sites below).
const seoSchema = z.object({
  title: z.string().nullable(),
  description: z.string().nullable(),
})

const selectedOptionSchema = z.object({
  name: z.string(),
  value: z.string(),
})

// `Image.url` is the only non-nullable field on Storefront API's `Image`
// type. `altText`, `width`, and `height` are all nullable — the image
// fragment always selects them, so the keys are always present, but their
// values can be `null` (width/height specifically when the image isn't
// hosted by Shopify).
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

// ---------------------------------------------------------------------------
// Product (products.ts, collections.ts)
// ---------------------------------------------------------------------------

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

// `description`, `descriptionHtml`, `priceRange`, `seo`, `tags`, `options`,
// and `updatedAt` are all non-null on Storefront API's `Product` type and
// are unconditionally selected by `productFragment`, so they're required
// here even though `ShopifyProduct` marks some of them optional (a required
// source is assignable to an optional target). `options` and `updatedAt`
// aren't part of the `ShopifyProduct` TS type, but `reshapeProduct()` does
// `const { images, variants, ...rest } = product` and spreads `...rest`
// into the reshaped `Product` (which *does* declare `options`) — declaring
// them explicitly here keeps that data alive without needing
// `.passthrough()`.
const shopifyProductSchema = z.object({
  id: z.string(),
  handle: z.string(),
  title: z.string(),
  tags: z.array(z.string()),
  availableForSale: z.boolean(),
  images: edgeNode(shopifyImageSchema),
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

// ---------------------------------------------------------------------------
// Collection (collections.ts)
// ---------------------------------------------------------------------------

// `description`, `seo`, and `updatedAt` are non-null on Storefront API's
// `Collection` type and are unconditionally selected by
// `collectionFragment`, so they're required here even though `Collection`
// marks them optional. `path` is deliberately NOT declared — it isn't a
// Shopify field at all; `reshapeCollection()` computes it client-side.
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

// ---------------------------------------------------------------------------
// Menu + Page (pages.ts)
// ---------------------------------------------------------------------------

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

// `id`, `title`, `handle`, `body`, `bodySummary`, `createdAt`, and
// `updatedAt` are all non-null on Storefront API's `Page` type. Unlike
// Product/Collection, `Page.seo` itself is nullable (not just its
// title/description) — it's `null` until a merchant sets page-level SEO.
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

// ---------------------------------------------------------------------------
// Cart (cart-operations.ts)
// ---------------------------------------------------------------------------

// `ShopifyCartLineItem.merchandise.product` only declares
// `{id, handle, title, featuredImage}` — nothing in the app reads any of
// the other fields the cart fragment pulls in via the full product
// fragment (`...product`), so they're intentionally not declared here and
// get stripped rather than kept alive with `.passthrough()`.
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
    // Deprecated + nullable on Storefront API's `CartCost` — see the
    // `DefaultCart.cost.totalTaxAmount` comment in `types.ts`.
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

// ---------------------------------------------------------------------------
// Customer (customer/actions.ts)
// ---------------------------------------------------------------------------

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

// `customerCreateMutation` only requests `id, email, firstName, lastName` —
// it does NOT fetch `orders`, unlike the full `Customer` type (used by
// `getCustomerQuery` below, which does fetch orders). Validating against the
// fields actually queried here (rather than the full `Customer` interface)
// avoids rejecting a real, well-formed response at the boundary.
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
