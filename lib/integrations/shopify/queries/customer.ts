export const getCustomerQuery = /* GraphQL */ `
  query getCustomer($customerAccessToken: String!) {
    customer(customerAccessToken: $customerAccessToken) {
      id
      firstName
      lastName
      email
      phone
      addresses(first: 5) {
        edges {
          node {
            id
            address1
            address2
            city
            province
            country
            zip
          }
        }
      }
      orders(first: 5) {
        edges {
          node {
            id
            orderNumber
            totalPrice {
              amount
              currencyCode
            }
            processedAt
            fulfillmentStatus
          }
        }
      }
    }
  }
`
