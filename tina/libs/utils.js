export const isTemplate = (data, pageId) => data[pageId]?.edges

export const convertTinaArrayToObject = (originalArray) =>
  originalArray.reduce((result, item, currentIndex) => {
    const { __typename, ...rest } = item
    let key = __typename
    if (result[key]) {
      key = `${key}-${currentIndex}`
    }
    result[key] = rest
    return result
  }, {})

export const convertToCamelCase = (inputString) => {
  return inputString.charAt(0).toLowerCase() + inputString.slice(1)
}

export const shortenObjectKeys = (obj, keyword) => {
  let position = 0
  const regex = new RegExp(`[^]+${keyword}(.*)`)

  for (const key in obj) {
    const match = key.match(regex)

    if (match) {
      const newKey = convertToCamelCase(match[1])
      obj[newKey] = obj[key]
      obj[newKey].sectionId = `${newKey}-${position}`
      delete obj[key]
      position++
    }
  }

  return obj
}

// function sortReferencedData(references, referencedData) {
//   const titleOrder = {}
//   references.forEach((ref, index) => {
//     const title = ref?.reference?.split('/')?.pop()?.replace('.md', '')
//     titleOrder[title] = index
//   })

//   return referencedData.slice().sort((a, b) => {
//     const titleA = a.title.split('/').pop()
//     const titleB = b.title.split('/').pop()

//     return titleOrder[titleA] - titleOrder[titleB]
//   })
// }

// export const getReferencesData = async (references) => {
//   const filterReferences = references.filter((item) => !!item?.reference)

//   const parseSlugs = filterReferences?.map((item) =>
//     item?.reference?.split('/').pop()?.replace('.md', ''),
//   )

//   const [{ data }] = await Promise.all([
//     // check tina/queries/extend.graphql for the query
//     client.queries['getReferences']({
//       referenceFilter: {
//         title: {
//           in: parseSlugs,
//         },
//       },
//     }),
//   ])

//   let innerData
//   for (let key in data) {
//     if (data[key].edges) {
//       innerData = data[key].edges.map(({ node }) => node)
//     }
//   }

//   return sortReferencedData(filterReferences, innerData)
// }

// // Targets match the name of the section in the CMS as it is in the __typename, set up for referencesBlock in blocks.
// const targets = ['ReferencesBlock']
// // Keys match the name of the field in the CMS,
// // set up for referencesBlock in blocks.
// const keys = ['references']

// export const fetchReferencedDataSection = async ({ data }, pageId) => {
//   let nestedData = {}

//   if (isTemplate(data, pageId)) {
//     nestedData = data[pageId].edges[0].node
//   } else {
//     nestedData = data[pageId]
//   }

//   if (!nestedData?.sections) return data

//   for (const target of targets) {
//     const referencesIndex = nestedData?.sections?.findIndex(({ __typename }) =>
//       __typename.includes(target),
//     )

//     if (referencesIndex === -1) continue

//     const references = []
//     for (const key of keys) {
//       const current = nestedData?.sections[referencesIndex][key]

//       if (!isEmptyArray(current)) {
//         references.push(...current)
//       }
//     }

//     const referencedData = await getReferencesData(references)

//     nestedData.sections[referencesIndex].references = referencedData
//   }

//   return data
// }
