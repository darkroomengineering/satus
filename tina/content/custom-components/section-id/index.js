import React from 'react'
import { wrapFieldsWithMeta } from 'tinacms'
import { CopyToClipboard } from '../copy-to-clipboard'

const description =
  'Copy this id and paste it into the link url field of the navigation item you want to link to this section.'

export const sectionId = ({
  name = 'sectionId',
  label = 'Section Id for Anchor Link',
  path = '',
  componentName = 'component name',
  depth = 1,
} = {}) => ({
  name,
  label: label,
  type: 'number',
  ui: {
    description: description,
    parse: (val) => Number(val),
    component: wrapFieldsWithMeta((data) => {
      const slug = data?.tinaForm?.finalForm?.getState()?.values?.slug
        ? `/${data?.tinaForm?.finalForm?.getState()?.values?.slug}`
        : ''

      const [id] = React.useState(
        `/${path}${slug}/#${componentName}-${
          data?.input?.name?.split('.')[depth]
        }`,
      )

      return CopyToClipboard({ content: id })
    }),
  },
})
