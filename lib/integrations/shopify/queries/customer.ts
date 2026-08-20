export const getCustomerQuery = /* GraphQL */ `
  query getCustomer($customerAccessToken: String!) {
    customer(customerAccessToken: $customerAccessToken) {
      id
      firstName
      lastName
      email
      orders(first: 5) {
        edges {
          node {
            id
            orderNumber
            totalPrice {
              amount
              currencyCode
            }
          }
        }
      }
    }
  }
`
