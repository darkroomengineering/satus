import { Collection } from '../..'
import { firstLayerBlocks } from '../../blocks'

const { media, link } = firstLayerBlocks

const hero = {
  name: 'firstFold', // Don't use word hero in here
  type: 'object',
  max: 1,
  fields: [
    { name: 'title', type: 'string', required: true },
    media({ max: 1 }),
  ],
  ui: {
    defaultItem: {
      title: 'hero',
    },
  },
}

const sectionFold = {
  name: 'firstSection', // Don't use word hero in here
  type: 'object',
  max: 1,
  fields: [{ name: 'title', type: 'string', required: true }, link({ max: 1 })],
  ui: {
    defaultItem: {
      title: 'Section',
    },
  },
}

const collection = new Collection(
  'templates',
  'Templates',
  'tina/content/pages/templates/slugs',
  'md',
)

collection.setHero = [hero]

collection.setFields = {
  slug: true,
  sections: [sectionFold],
}

collection.setUi = (item) => {
  return `tina/templates/${item.document._sys.title}`
}

export const templatesCollection = collection
