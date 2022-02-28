import { badRequest, internalServerError, success } from 'lib/api/responses'
import Shopify from 'lib/shopify'

const Product = async (req, res) => {
  const store = new Shopify()
  try {
    const { id } = req.query
    const { variantId, quantity, lineItemId, putAction } = req.body

    if (typeof id !== 'string') {
      return badRequest(res, `Id is a required query parameter.`)
    }

    switch (req.method) {
      case 'GET': {
        // Fetch
        const checkout = await store.fetchCart({ cartId: id })
        success(res, { checkout })
        break
      }
      case 'POST': {
        // Add
        if (typeof variantId !== 'string' || typeof quantity !== 'number') {
          return badRequest(
            res,
            `Some params are missing in the body: ${JSON.stringify(req.body)}.`
          )
        }
        const checkout = await store.addItemToCart({
          cartId: id,
          lines: [
            {
              merchandiseId: variantId,
              quantity: quantity,
            },
          ],
        })
        success(res, { checkout })
        break
      }
      case 'PUT': {
        // Update & remove
        if (typeof lineItemId !== 'string' || typeof putAction !== 'string') {
          return badRequest(
            res,
            `Some params are missing in the body: ${JSON.stringify(req.body)}.`
          )
        }
        switch (putAction) {
          case 'update': {
            if (typeof quantity !== 'number') {
              return badRequest(
                res,
                `Some params are missing in the body: ${JSON.stringify(
                  req.body
                )}.`
              )
            }
            const checkout = await store.updateItemCart({
              cartId: id,
              lines: [
                {
                  id: lineItemId,
                  quantity: quantity,
                },
              ],
            })
            success(res, { checkout })
            break
          }
          case 'remove': {
            const checkout = await store.removeItemToCart({
              cartId: id,
              lineIds: [lineItemId],
            })
            success(res, { checkout })
            break
          }
          default:
            badRequest(res, `Put action ${putAction} not supported.`)
            break
        }
        break
      }
      default:
        badRequest(res, `Request method ${req.method} not supported.`)
        break
    }
  } catch (error) {
    internalServerError(res, error)
  }
}

export default Product
