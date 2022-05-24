import { GraphQLClient } from 'graphql-request'

const fetchCmsQuery = async (query, variables) => {
  try {
    const endpoint = `https://graphql.contentful.com/content/v1/spaces/${process.env.NEXT_CONTENTFUL_SPACE_ID}`
    const graphQLClient = new GraphQLClient(endpoint, {
      headers: {
        authorization: `Bearer ${
          variables.preview
            ? process.env.NEXT_CONTENTFUL_PREVIEW_TOKEN
            : process.env.NEXT_CONTENTFUL_ACCESS_TOKEN
        }`,
      },
    })
    return await graphQLClient.request(query, variables)
  } catch (error) {
    console.error(
      `There was a problem retrieving entries with the query ${query}`
    )
    console.error(error)
  }
}

class CmsMethods {
  slugTester = (slug) => {
    return typeof slug !== 'string' ? 'exclude' : slug
  }

  slugMe = (name, lastname) => {
    const prettier = (word) => {
      return word.trim().toLowerCase()
    }
    return `${prettier(name)}-${prettier(lastname)}`
  }

  toLink(item) {
    const link = item
      ? {
          text: item?.text || null,
          url: item?.url || '/',
        }
      : {
          text: null,
          url: '/',
        }
    return link
  }

  ctaLenght(item) {
    const cta = item.length > 0 ? {} : false

    if (item.length >= 2) {
      cta.primary = this.toLink(item[0])
      cta.secondary = this.toLink(item[1])
    } else {
      cta.primary = this.toLink(item[0])
    }

    return cta
  }

  imageLighter(input, ...quality) {
    const imgQuality = 0 < quality[0] && quality[0] <= 100 ? quality[0] : 95
    const image = input?.url || null
    return image
      ? image.includes('jpeg') || image.includes('jpg')
        ? `${image}?fm=jpg&fl=progressive&q=${imgQuality}`
        : `${image}?q=${imgQuality}`
      : image
  }

  metadata(input) {
    const preInput = input
      ? input
      : { title: null, description: null, og: null, keywords: null }
    return {
      title: preInput?.title || 'TITLE',
      description: preInput.description || 'DESCRIPTION',
      og: preInput?.openGraphImage
        ? this.imageLighter(preInput.openGraphImage)
        : '/og.jpg',
      keywords: preInput?.keywords || ['KEYWORD'],
    }
  }

  prefooter(input) {
    return {
      title: input.title,
      description: input.description,
      cta: this.toLink(input.cta),
      image: this.imageLighter(input.image),
      icon: this.imageLighter(input.icon),
    }
  }
}

export { CmsMethods, fetchCmsQuery }
