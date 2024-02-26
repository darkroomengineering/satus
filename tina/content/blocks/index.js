// const { colors } = require('config/variables.js') not working
import { minMaxLength, nameItem } from '../../utils/index.js'
import { customReference } from '../custom-components/references/index.js'

const colors = [
  '#1072FA',
  '#FFFDF9',
  '#000000',
  '#DEDFDF',
  '#A6A5A2',
  '#FFD540',
  '#B58DFF',
  '#FF8360',
  '#BDFFFF',
]

const colorPallete = ({ label = 'Color', name = 'color' } = {}) => ({
  type: 'string',
  label,
  name,
  ui: {
    component: 'color',
    colorFormat: 'hex',
    colors,
    widget: 'block',
  },
})

const link = ({ label = 'Link', name = 'link', min = 0, max = null } = {}) => ({
  label,
  name,
  list: true,
  type: 'object',
  ui: {
    ...nameItem('text'),
    ...minMaxLength({ min, max }),
    defaultItem: {
      text: 'Link',
      url: 'https://studiofreight.com',
    },
  },
  fields: [
    {
      type: 'string',
      label: 'Text',
      name: 'text',
      required: true,
    },
    {
      type: 'string',
      label: 'Url',
      name: 'url',
      required: true,
    },
  ],
})

const stringList = ({
  label = 'String List',
  name = 'stringList',
  min = 1,
  max = null,
} = {}) => ({
  label,
  name,
  type: 'object',
  list: true,
  fields: [
    {
      type: 'string',
      label: 'Text',
      name: 'text',
      required: true,
    },
  ],
  ui: {
    defaultItem: { text: 'Text' },
    ...nameItem('text'),
    ...minMaxLength({ min, max }),
  },
})

const media = ({
  label = 'Media',
  name = 'media',
  min = 0,
  max = null,
  description = '',
} = {}) => {
  return {
    label,
    name,
    type: 'object',
    list: true,
    description,
    fields: [
      {
        type: 'string',
        label: 'Caption',
        name: 'caption',
        required: true,
      },
      {
        type: 'image',
        label: 'Source',
        name: 'source',
        required: true,
      },
    ],
    ui: {
      defaultItem: {
        caption: 'Caption',
        source: '/cms/sf-og.jpg',
      },
      ...nameItem('caption'),
      ...minMaxLength({ min, max }),
    },
  }
}

const date = ({
  type = 'datetime',
  name = 'date',
  label = 'Date',
  required = true,
  dateFormat = 'YYYY-MM-DD',
} = {}) => ({
  type,
  label,
  name,
  required,
  dateFormat: 'YYYY',
  ui: {
    dateFormat,
    defaultItem: '2024-01-11T00:00:00.000Z',
  },
})

/*
  To avoid data consistency issues when a file is deleted and
  is referenced in another file, this custom reference block:

  Will create a string with the filename and will save it, 
  same as the default reference field.

  It will return a warning if the file is deleted and the reference is used

  Unfortunatelly, needs some settings:

  - Set the path to the folder where the markdown files are
  in the libs/tina/cache-files-for-references.js file. This file will
  be used to cache the filenames in the public folder and test consistency.

  - Remember you will need to query the reference field separatly, as you only get a pointer to the markdown file. 
    If you use the referencesBlock at Sections level:
    For server side you can use the fetchReferencedData function.
    For client side (visual editing) use the useTinaClientReferenceBlock hook.
 */

const referenceBlock = ({
  label = 'Reference Block',
  referenceTo = 'cache-filenames.json',
  max = null,
} = {}) => ({
  label,
  name: 'referencesBlock',
  type: 'object',
  fields: [
    {
      name: 'references',
      label: 'References',
      type: 'object',
      list: true,
      fields: [
        customReference({
          filePath: referenceTo,
        }),
      ],
      ui: {
        defaultItem: 'tina/content/pages/templates/slugs/one.md',
        ...minMaxLength({ max }),
      },
    },
  ],
  ui: {
    defaultItem: {
      title: 'Reference Block',
      references: [{ reference: 'tina/content/pages/templates/slugs/one.md' }],
    },
  },
})

export const firstLayerBlocks = {
  link,
  stringList,
  colorPallete,
  media,
  date,
  referenceBlock,
}
