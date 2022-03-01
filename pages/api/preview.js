import { CmsApi, fetchCmsQuery } from 'contentful/api'

export default async function preview(req, res) {
  const response = req.query
  const previewToken = process.env.NEXT_CONTENTFUL_PREVIEW_TOKEN

  const fetchData = async (resource, slug, type) => {
    switch (type) {
      case 'true':
        return fetchCmsQuery(resource, {
          preview: true,
          slug: slug,
        })
      case 'false':
        const fetch = new CmsApi(resource)
        return await fetch.fetchEntrybyContentType(4, preview)
    }
  }

  const responseSelector = {
    homePage: {
      query: homePageCollection,
      field: 'homePageCollection',
      redirectPath: 'slug',
      urlPrefix: '/',
    },
  }

  async function redirectPreview({
    secret,
    slug,
    query,
    field,
    graphql,
    redirectPath,
    urlPrefix,
  }) {
    if (secret !== previewToken || !slug) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const data = await fetchData(query, slug, graphql)

    const redirectSlug =
      graphql === 'true'
        ? data[field].items[0][redirectPath]
        : data
            .filter((item) => item.fields.slug === slug)
            .map((item) => item.fields.slug)[0]

    if (!redirectSlug) {
      return res.status(401).json({ message: 'Invalid slug' })
    }

    res.setPreviewData({})
    res.writeHead(307, {
      Location: `${urlPrefix}${redirectSlug}`,
    })
  }

  await redirectPreview({ ...responseSelector[response.type], ...response })
  res.end()
}
