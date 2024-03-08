import { nameItem } from '../../utils'

export const globalModalsCollection = {
  name: 'modals',
  label: 'Modals',
  path: 'tina/content/global',
  match: { include: 'modals' },
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
    {
      name: 'entries',
      label: 'Entries',
      type: 'object',
      list: true,
      fields: [
        {
          type: 'string',
          name: 'url',
          label: 'URL',
          required: true,
          ui: {
            description:
              'The URL that will trigger the modal. Example: ?modal-unique-id=true',
          },
        },
        {
          name: 'title',
          label: 'Title',
          type: 'string',
          required: true,
        },
      ],
      ui: {
        ...nameItem('title'),
        defaultItem: {
          title: 'modal',
          entries: [
            {
              title: 'modal',
              url: '?modal=true',
            },
          ],
        },
      },
    },
  ],
  searchable: false,
  ui: {
    allowedActions: {
      create: true,
      delete: false,
    },
    global: true,
    defaultItem: {
      title: 'modals',
      entries: [
        {
          title: 'modal',
          url: '?modal=true',
        },
      ],
    },
  },
}
