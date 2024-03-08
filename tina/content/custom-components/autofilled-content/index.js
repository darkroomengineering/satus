import React from 'react'
import { wrapFieldsWithMeta } from 'tinacms'

/* eslint-disable */

export const AutoFilled = ({
  name = 'autoFilled',
  label = 'AutoFilled',
  content = 'Auto-filled content',
} = {}) => ({
  name,
  label,
  type: 'string',
  ui: {
    defaultItem: content,
    component: wrapFieldsWithMeta(() => {
      React.useEffect(() => {}, [])

      return (
        <div className="shadow-inner focus:shadow-outline focus:border-blue-500 focus:outline-none block text-base placeholder:text-gray-300 px-3 py-2 text-gray-600 w-full bg-white border border-gray-200 transition-all ease-out duration-150 focus:text-gray-900 rounded-md">
          {content}
        </div>
      )
    }),
  },
})
