import { badRequest, internalServerError, success } from 'lib/api/responses'
import Shopify from 'lib/shopify'

const Products = async (req, res) => {
  const store = new Shopify()
  try {
    const { id } = req.query
    switch (req.method) {
      case 'GET': {
        const products = await store.getProductById(id)
        success(res, { products })
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

export default Products
