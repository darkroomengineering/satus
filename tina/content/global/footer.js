import { firstLayerBlocks } from '../blocks'
const { link } = firstLayerBlocks

export const globalFooterCollection = {
  name: 'footer',
  label: 'Footer',
  path: 'tina/content/global',
  match: { include: 'footer' },
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
    link({ min: 1, max: 5 }),
  ],
  searchable: false,
  ui: {
    allowedActions: {
      create: false,
      delete: false,
    },
    global: true,
    defaultItem: {
      title: 'Footer',
      link: [
        {
          text: 'tinaCMS',
          url: '/tina',
        },
      ],
    },
  },
}
