import { minMaxLength, nameItem } from '../../utils'
import { firstLayerBlocks } from '../blocks'
const { link } = firstLayerBlocks

const navigation = {
  name: 'navigation',
  label: 'Navigation',
  type: 'object',
  list: true,
  fields: [
    {
      name: 'title',
      label: 'Title',
      type: 'string',
      required: true,
    },
    link({ min: 1, max: 1 }),
  ],
  ui: {
    defaultItem: {
      title: 'Navigation',
      link: [
        {
          text: 'tinaCMS',
          url: '/tina',
        },
      ],
    },
    ...minMaxLength({ max: 4 }),
    ...nameItem('title'),
  },
}

export const globalHeaderCollection = {
  name: 'header',
  label: 'Header',
  path: 'tina/content/global',
  match: { include: 'header' },
  format: 'md',
  fields: [
    {
      name: 'title',
      label: 'Title',
      type: 'string',
      required: true,
      isTitle: true,
      ui: {
        description:
          'this field is for indexing purposes and text will be slugified',
        parse: (val) =>
          val &&
          val
            .toLowerCase()
            .replace(/ /g, '-')
            .replace(/[^\w-]+/g, ''),
      },
    },
    link({ name: 'link', label: 'Link', min: 1, max: 3 }),
    navigation,
  ],
  searchable: false,
  ui: {
    allowedActions: {
      create: false,
      delete: false,
    },
    global: true,
    defaultItem: {
      title: 'Header',
      link: [
        {
          text: 'tinaCMS',
          url: '/tina',
        },
      ],
      navigation: {
        title: 'Navigation',
        link: [
          {
            text: 'tinaCMS',
            url: '/tina',
          },
        ],
      },
    },
  },
}
