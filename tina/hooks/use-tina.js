import {
  convertTinaArrayToObject,
  isTemplate,
  shortenObjectKeys,
} from 'tina/libs/utils'
import { useTina } from 'tinacms/dist/react'

// Hook for converting array to objets and parse variables names
export const useTinaObjects = (input, pageId) => {
  let nestedData = {}
  let hero = {}
  let global = { metadata: {} }
  let sections = {}

  const { data } = useTina(input)

  if (isTemplate(data, pageId)) {
    nestedData = data[pageId].edges[0].node
  } else {
    nestedData = data[pageId]
  }

  if (nestedData.hero) {
    hero = convertTinaArrayToObject(nestedData.hero)
    hero = shortenObjectKeys(hero, 'Hero')
  }

  if (nestedData.global) {
    global = convertTinaArrayToObject(nestedData.global)
    global = shortenObjectKeys(global, 'Global')
  }

  if (nestedData.sections) {
    sections = convertTinaArrayToObject(nestedData.sections)
    sections = shortenObjectKeys(sections, 'Sections')
  }

  return { hero, global, sections, data }
}
