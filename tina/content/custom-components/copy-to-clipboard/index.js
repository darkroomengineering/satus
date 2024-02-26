import React, { useState } from 'react'
import { useCopyToClipboard } from 'react-use'
import { wrapFieldsWithMeta } from 'tinacms'

export const CopyToClipboard = ({
  content,
  message = 'Copied to clipboard',
}) => {
  const [state, copyToClipboard] = useCopyToClipboard()
  const [hideMessage, setHideMessage] = useState(true)

  React.useEffect(() => {
    if (!!state.value) {
      setHideMessage(false)

      setInterval(() => {
        setHideMessage(true)
      }, 2500)
    }
  }, [state])

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          copyToClipboard(content)
        }}
        className="shadow-inner focus:shadow-outline focus:border-blue-500 focus:outline-none block text-base placeholder:text-gray-300 px-3 py-2 text-gray-600 w-full bg-white border border-gray-200 transition-all ease-out duration-150 focus:text-gray-900 rounded-md"
      >
        {content}
      </button>
      <p className="overflow-hidden">
        <span
          className={`block font-mono text-xs text-green-600 mt-2 ${hideMessage && '-translate-x-full'} transition-transform duration-500 ease-in-out`}
        >
          {message}
        </span>
      </p>
    </div>
  )
}

export const copyToClipboard = ({
  name = 'copyToClipboard',
  label = 'Copy To Clipboard',
  content = 'copyToClipboard',
  message,
} = {}) => ({
  name,
  label,
  type: 'string',
  ui: {
    description: 'Copy to clipboard',
    parse: (val) => Number(val),
    component: wrapFieldsWithMeta(() => CopyToClipboard({ content, message })),
  },
})
