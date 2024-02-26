import { firstLayerBlocks } from '../blocks'
const { colorPallete } = firstLayerBlocks

export const metadata = {
  name: 'metadata',
  label: 'Metadata',
  type: 'object',
  list: true,
  max: 1,
  fields: [
    {
      type: 'string',
      label: 'Title',
      name: 'title',
      required: true,
    },
    {
      type: 'string',
      label: 'Description',
      name: 'description',
      ui: {
        component: 'textarea',
      },
    },
    {
      name: 'keywords',
      label: 'Keywords',
      type: 'string',
      list: true,
    },
    {
      type: 'image',
      label: 'Image',
      name: 'image',
      required: true,
    },
    {
      type: 'string',
      label: 'Twitter Handle',
      name: 'twitterHandle',
    },
    {
      type: 'object',
      label: 'Theme',
      name: 'theme',
      fields: [
        colorPallete({ label: 'Mask', name: 'mask' }),
        colorPallete({ label: 'Tile', name: 'tile' }),
        colorPallete({ label: 'Color', name: 'color' }),
      ],
    },
  ],
  ui: {
    defaultItem: {
      title: 'Metadata title',
      description: 'Metadata description',
      keywords: ['Metadata keyword'],
      image: '/cms/sf-og.jpg',
      twitterHandle: '',
      theme: {
        mask: '#000000',
        tile: '#C5F17B',
        color: '#C5F17B',
      },
    },
  },
}
